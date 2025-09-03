const express = require('express');
const cors = require('cors');
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
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://your-frontend-domain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-key', 'x-secret-key', 'x-region']
}));

app.use(express.json());

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

// Liste des buckets
app.get('/api/buckets', extractCredentials, async (req, res) => {
  try {
    const command = new ListBucketsCommand({});
    const response = await req.s3Client.send(command);
    
    const buckets = (response.Buckets || []).map(bucket => ({
      name: bucket.Name || '',
      creationDate: bucket.CreationDate || new Date(),
      region: req.headers['x-region'] || 'eu-west-2'
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
      response.CommonPrefixes.forEach(prefix => {
        if (prefix.Prefix) {
          objects.push({
            key: prefix.Prefix,
            lastModified: new Date(),
            size: 0,
            etag: '',
            storageClass: 'STANDARD',
            isFolder: true
          });
        }
      });
    }
    
    // Fichiers
    if (response.Contents) {
      response.Contents.forEach(object => {
        if (object.Key && object.Key !== prefix) {
          objects.push({
            key: object.Key,
            lastModified: object.LastModified || new Date(),
            size: object.Size || 0,
            etag: object.ETag || '',
            storageClass: object.StorageClass || 'STANDARD',
            isFolder: false
          });
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
app.get('/api/buckets/:bucket/objects/:key/download', extractCredentials, async (req, res) => {
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
  console.log(`   GET  /health`);
  console.log(`   GET  /api/buckets`);
  console.log(`   POST /api/buckets`);
  console.log(`   GET  /api/buckets/:bucket/objects`);
});