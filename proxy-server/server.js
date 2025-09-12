const express = require('express');
const cors = require('cors');
const multer = require('multer');
const {
  S3Client,
  ListBucketsCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration CORS permissive
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080', 'https://your-frontend-domain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-key', 'x-secret-key', 'x-region']
}));

app.use(express.json({ limit: '50mb' }));

// Configuration multer pour upload de fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// Endpoints Outscale
const getOutscaleEndpoint = (region) => {
  const endpoints = {
    'eu-west-2': 'https://oos.eu-west-2.outscale.com',
    'cloudgouv-eu-west-1': 'https://oos.cloudgouv-eu-west-1.outscale.com',
    'us-east-2': 'https://oos.us-east-2.outscale.com',
    'us-west-1': 'https://oos.us-west-1.outscale.com'
  };
  return endpoints[region] || endpoints['eu-west-2'];
};

// Middleware pour extraire les credentials des headers
const extractCredentials = (req, res, next) => {
  const accessKey = req.headers['x-access-key'];
  const secretKey = req.headers['x-secret-key'];
  const region = req.headers['x-region'] || 'eu-west-2';

  if (!accessKey || !secretKey) {
    return res.status(400).json({
      success: false,
      error: 'Credentials manquantes'
    });
  }

  req.s3Client = new S3Client({
    region,
    endpoint: getOutscaleEndpoint(region),
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey
    },
    forcePathStyle: true
  });

  next();
};

// Route de test
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Proxy CORS NumS3 opérationnel' });
});

// Liste des buckets avec statistiques
app.get('/api/buckets', extractCredentials, async (req, res) => {
  try {
    const command = new ListBucketsCommand({});
    const response = await req.s3Client.send(command);

    const buckets = await Promise.all((response.Buckets || []).map(async (bucket) => {
      try {
        // Récupérer les statistiques du bucket
        const listCommand = new ListObjectsV2Command({
          Bucket: bucket.Name
        });
        const objectsResponse = await req.s3Client.send(listCommand);
        
        const objectCount = objectsResponse.KeyCount || 0;
        const size = (objectsResponse.Contents || []).reduce((total, obj) => total + (obj.Size || 0), 0);

        return {
          name: bucket.Name || '',
          creationDate: bucket.CreationDate || new Date(),
          region: req.headers['x-region'] || 'eu-west-2',
          objectCount,
          size
        };
      } catch (statsError) {
        console.warn(`Impossible de récupérer les stats pour ${bucket.Name}:`, statsError.message);
        return {
          name: bucket.Name || '',
          creationDate: bucket.CreationDate || new Date(),
          region: req.headers['x-region'] || 'eu-west-2',
          objectCount: 0,
          size: 0
        };
      }
    }));

    res.json({ success: true, data: buckets });
  } catch (error) {
    console.error('Erreur liste buckets:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des buckets',
      message: error.message
    });
  }
});

// Créer un bucket
app.post('/api/buckets', extractCredentials, async (req, res) => {
  try {
    const { name } = req.body;
    const command = new CreateBucketCommand({ Bucket: name });
    await req.s3Client.send(command);

    res.json({ success: true, message: `Bucket "${name}" créé` });
  } catch (error) {
    console.error('Erreur création bucket:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création',
      message: error.message
    });
  }
});

// Supprimer un bucket
app.delete('/api/buckets/:name', extractCredentials, async (req, res) => {
  try {
    const { name } = req.params;
    const command = new DeleteBucketCommand({ Bucket: name });
    await req.s3Client.send(command);

    res.json({ success: true, message: `Bucket "${name}" supprimé` });
  } catch (error) {
    console.error('Erreur suppression bucket:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression',
      message: error.message
    });
  }
});

// Liste des objets
app.get('/api/buckets/:bucket/objects', extractCredentials, async (req, res) => {
  try {
    const { bucket } = req.params;
    const { prefix = '', delimiter = '/' } = req.query;

    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: delimiter
    });

    const response = await req.s3Client.send(command);
    const objects = [];

    // Dossiers
    if (response.CommonPrefixes) {
      response.CommonPrefixes.forEach(prefixObj => {
        if (prefixObj.Prefix) {
          // Extraire le nom du dossier sans le préfixe parent
          let folderName = prefixObj.Prefix;
          if (prefix && folderName.startsWith(prefix)) {
            folderName = folderName.substring(prefix.length);
          }
          // Retirer le slash final
          folderName = folderName.replace(/\/$/, '');
          
          if (folderName) {
            objects.push({
              key: folderName,
              lastModified: new Date(),
              size: 0,
              etag: '',
              storageClass: 'STANDARD',
              isFolder: true
            });
          }
        }
      });
    }

    // Fichiers
    if (response.Contents) {
      response.Contents.forEach(object => {
        if (object.Key && object.Key !== prefix && !object.Key.endsWith('/')) {
          // Extraire le nom du fichier sans le préfixe parent
          let fileName = object.Key;
          if (prefix && fileName.startsWith(prefix)) {
            fileName = fileName.substring(prefix.length);
          }
          
          // Ignorer les fichiers dans des sous-dossiers (contenant des slashes)
          if (!fileName.includes('/')) {
            objects.push({
              key: fileName,
              lastModified: object.LastModified || new Date(),
              size: object.Size || 0,
              etag: object.ETag || '',
              storageClass: object.StorageClass || 'STANDARD',
              isFolder: false
            });
          }
        }
      });
    }

    res.json({ success: true, data: objects });
  } catch (error) {
    console.error('Erreur liste objets:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des objets',
      message: error.message
    });
  }
});

// URL de téléchargement
app.get('/api/buckets/:bucket/objects/:key(*)/download', extractCredentials, async (req, res) => {
  try {
    const { bucket, key } = req.params;
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(req.s3Client, command, { expiresIn: 3600 });

    res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('Erreur URL téléchargement:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur génération URL',
      message: error.message
    });
  }
});

// Upload de fichier
app.post('/api/buckets/:bucket/objects', extractCredentials, upload.single('file'), async (req, res) => {
  try {
    const { bucket } = req.params;
    const { path = '' } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier fourni'
      });
    }

    const key = path ? `${path}/${req.file.originalname}` : req.file.originalname;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    });

    await req.s3Client.send(command);

    res.json({
      success: true,
      message: `Fichier "${req.file.originalname}" uploadé`,
      data: { key }
    });
  } catch (error) {
    console.error('Erreur upload fichier:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload',
      message: error.message
    });
  }
});

// Supprimer un objet
app.delete('/api/buckets/:bucket/objects/:key(*)', extractCredentials, async (req, res) => {
  try {
    const { bucket, key } = req.params;
    const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    await req.s3Client.send(command);

    res.json({ success: true, message: `Objet "${key}" supprimé` });
  } catch (error) {
    console.error('Erreur suppression objet:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression',
      message: error.message
    });
  }
});

// Créer un dossier
app.post('/api/buckets/:bucket/folders', extractCredentials, async (req, res) => {
  try {
    const { bucket } = req.params;
    const { path = '', folderName } = req.body;

    if (!folderName) {
      return res.status(400).json({
        success: false,
        error: 'Nom de dossier requis'
      });
    }

    const key = path ? `${path}/${folderName}/` : `${folderName}/`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: '',
      ContentType: 'application/x-directory'
    });

    await req.s3Client.send(command);

    res.json({
      success: true,
      message: `Dossier "${folderName}" créé`,
      data: { key }
    });
  } catch (error) {
    console.error('Erreur création dossier:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du dossier',
      message: error.message
    });
  }
});

// Gestion des erreurs
app.use((error, req, res, next) => {
  console.error('Erreur serveur:', error);
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy CORS NumS3 démarré sur le port ${PORT}`);
  console.log(`📡 Endpoints disponibles:`);
  console.log(`   GET    /health`);
  console.log(`   GET    /api/buckets`);
  console.log(`   POST   /api/buckets`);
  console.log(`   DELETE /api/buckets/:name`);
  console.log(`   GET    /api/buckets/:bucket/objects`);
  console.log(`   POST   /api/buckets/:bucket/objects (upload)`);
  console.log(`   DELETE /api/buckets/:bucket/objects/:key`);
  console.log(`   POST   /api/buckets/:bucket/folders`);
  console.log(`   GET    /api/buckets/:bucket/objects/:key/download`);
});