const express = require('express');
const cors = require('cors');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const {
  S3Client,
  ListBucketsCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  GetBucketVersioningCommand,
  PutBucketVersioningCommand,
  GetObjectLockConfigurationCommand,
  GetObjectTaggingCommand,
  PutObjectTaggingCommand,
  DeleteObjectTaggingCommand,
  GetBucketLocationCommand,
  GetBucketEncryptionCommand,
  PutBucketEncryptionCommand,
  DeleteBucketEncryptionCommand,
  ListObjectVersionsCommand,
  GetObjectRetentionCommand,
  PutObjectRetentionCommand,
  GetObjectAclCommand,
  GetBucketLifecycleConfigurationCommand,
  PutBucketLifecycleConfigurationCommand,
  DeleteBucketLifecycleCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// SÉCURITÉ: Headers de sécurité obligatoires
// ============================================================
app.use((req, res, next) => {
  // Protection HTTPS (en production, utiliser un reverse proxy avec HTTPS)
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    console.warn('⚠️  ATTENTION: Connexion non sécurisée détectée. Utilisez HTTPS en production!');
  }

  // Headers de sécurité
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://oos.*.outscale.com"
  );

  next();
});

// ============================================================
// RATE LIMITING: Protection contre les abus
// ============================================================
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes par défaut
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requêtes par fenêtre
  message: {
    success: false,
    error: 'Trop de requêtes, veuillez réessayer plus tard',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter plus strict pour les opérations d'écriture
const strictLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_STRICT_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes
  max: parseInt(process.env.RATE_LIMIT_STRICT_MAX_REQUESTS) || 20, // 20 requêtes
  message: {
    success: false,
    error: 'Trop de requêtes d\'écriture, veuillez ralentir',
    retryAfter: '5 minutes'
  }
});

// Appliquer rate limiting
app.use('/api/', limiter);

// Configuration CORS permissive
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-key', 'x-secret-key', 'x-region']
}));

app.use(express.json({ limit: process.env.MAX_JSON_SIZE || '50mb' }));

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

// ============================================================
// MIDDLEWARE: Extraction sécurisée des credentials
// IMPORTANT: Les credentials transitent dans les headers
// ⚠️  EN PRODUCTION: Toujours utiliser HTTPS pour chiffrer la connexion
// ⚠️  Recommandé: Nginx/HAProxy en reverse proxy avec TLS
// ============================================================
const extractCredentials = (req, res, next) => {
  const accessKey = req.headers['x-access-key'];
  const secretKey = req.headers['x-secret-key'];
  const region = req.headers['x-region'] || 'eu-west-2';

  // Validation des credentials
  if (!accessKey || !secretKey) {
    console.warn('⚠️  Tentative de connexion sans credentials');
    return res.status(400).json({
      success: false,
      error: 'Credentials manquantes'
    });
  }

  // Validation basique du format
  if (accessKey.length < 10 || secretKey.length < 20) {
    console.warn('⚠️  Credentials au format invalide');
    return res.status(400).json({
      success: false,
      error: 'Format des credentials invalide'
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

        // Récupérer le statut du versioning
        let versioningEnabled = false;
        try {
          const versioningCmd = new GetBucketVersioningCommand({ Bucket: bucket.Name });
          const versioningResponse = await req.s3Client.send(versioningCmd);
          versioningEnabled = versioningResponse.Status === 'Enabled';
        } catch (error) {
          // Versioning not configured
        }

        // Récupérer le statut de l'object lock
        let objectLockEnabled = false;
        try {
          const lockCmd = new GetObjectLockConfigurationCommand({ Bucket: bucket.Name });
          await req.s3Client.send(lockCmd);
          objectLockEnabled = true;
        } catch (error) {
          // Object lock not configured
        }

        // Récupérer la location du bucket
        let location = req.headers['x-region'] || 'eu-west-2';
        try {
          const locationCmd = new GetBucketLocationCommand({ Bucket: bucket.Name });
          const locationResponse = await req.s3Client.send(locationCmd);
          location = locationResponse.LocationConstraint || req.headers['x-region'] || 'eu-west-2';
        } catch (error) {
          // Location not available
        }

        // Récupérer le statut de l'encryption
        let encryptionEnabled = false;
        try {
          const encryptionCmd = new GetBucketEncryptionCommand({ Bucket: bucket.Name });
          await req.s3Client.send(encryptionCmd);
          encryptionEnabled = true;
        } catch (error) {
          // Encryption not configured
        }

        return {
          name: bucket.Name || '',
          creationDate: bucket.CreationDate || new Date(),
          region: req.headers['x-region'] || 'eu-west-2',
          location,
          objectCount,
          size,
          versioningEnabled,
          objectLockEnabled,
          encryptionEnabled
        };
      } catch (statsError) {
        console.warn(`Impossible de récupérer les stats pour ${bucket.Name}:`, statsError.message);
        return {
          name: bucket.Name || '',
          creationDate: bucket.CreationDate || new Date(),
          region: req.headers['x-region'] || 'eu-west-2',
          location: req.headers['x-region'] || 'eu-west-2',
          objectCount: 0,
          size: 0,
          versioningEnabled: false,
          objectLockEnabled: false,
          encryptionEnabled: false
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

// Créer un bucket (avec rate limiting strict)
app.post('/api/buckets', strictLimiter, extractCredentials, async (req, res) => {
  try {
    const { name, objectLockEnabled, versioningEnabled, encryptionEnabled } = req.body;

    // Créer le bucket avec object lock si demandé
    const command = new CreateBucketCommand({
      Bucket: name,
      ObjectLockEnabledForBucket: objectLockEnabled
    });
    await req.s3Client.send(command);

    // Activer le versioning si demandé (requis pour object lock)
    if (versioningEnabled || objectLockEnabled) {
      const versioningCmd = new PutBucketVersioningCommand({
        Bucket: name,
        VersioningConfiguration: {
          Status: 'Enabled'
        }
      });
      await req.s3Client.send(versioningCmd);
    }

    // Activer l'encryption si demandé
    if (encryptionEnabled) {
      const encryptionCmd = new PutBucketEncryptionCommand({
        Bucket: name,
        ServerSideEncryptionConfiguration: {
          Rules: [
            {
              ApplyServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256'
              },
              BucketKeyEnabled: true
            }
          ]
        }
      });
      await req.s3Client.send(encryptionCmd);
    }

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

// Vider récursivement un bucket
const emptyBucket = async (s3Client, bucketName) => {
  let deletedCount = 0;
  let isTruncated = true;
  let continuationToken;

  while (isTruncated) {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      ContinuationToken: continuationToken
    });

    const listResponse = await s3Client.send(listCommand);

    if (listResponse.Contents && listResponse.Contents.length > 0) {
      // Supprimer les objets par lot
      for (const obj of listResponse.Contents) {
        if (obj.Key) {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: obj.Key
          });
          await s3Client.send(deleteCommand);
          deletedCount++;
        }
      }
    }

    isTruncated = listResponse.IsTruncated || false;
    continuationToken = listResponse.NextContinuationToken;
  }

  return deletedCount;
};

// Supprimer un bucket (avec vidange automatique si nécessaire + rate limiting strict)
app.delete('/api/buckets/:name', strictLimiter, extractCredentials, async (req, res) => {
  try {
    const { name } = req.params;
    const { force } = req.query;

    // Tenter la suppression directe
    try {
      const command = new DeleteBucketCommand({ Bucket: name });
      await req.s3Client.send(command);
      res.json({ success: true, message: `Bucket "${name}" supprimé` });
      return;
    } catch (deleteError) {
      // Si le bucket n'est pas vide et force=true, vider puis supprimer
      if (deleteError.name === 'BucketNotEmpty' && force === 'true') {
        console.log(`🗑️ Vidage du bucket "${name}" avant suppression...`);
        const deletedCount = await emptyBucket(req.s3Client, name);
        console.log(`✅ ${deletedCount} objets supprimés du bucket "${name}"`);

        // Réessayer la suppression
        const retryCommand = new DeleteBucketCommand({ Bucket: name });
        await req.s3Client.send(retryCommand);

        res.json({
          success: true,
          message: `Bucket "${name}" vidé (${deletedCount} objets) et supprimé`
        });
      } else {
        throw deleteError;
      }
    }
  } catch (error) {
    console.error('Erreur suppression bucket:', error);
    res.status(500).json({
      success: false,
      error: error.name === 'BucketNotEmpty' ? 'Le bucket contient des objets' : 'Erreur lors de la suppression',
      message: error.message,
      requiresForce: error.name === 'BucketNotEmpty'
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

    // Fichiers avec tags
    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key && object.Key !== prefix && !object.Key.endsWith('/')) {
          // Extraire le nom du fichier sans le préfixe parent
          let fileName = object.Key;
          if (prefix && fileName.startsWith(prefix)) {
            fileName = fileName.substring(prefix.length);
          }

          // Ignorer les fichiers dans des sous-dossiers (contenant des slashes)
          if (!fileName.includes('/')) {
            let tags = {};

            // Récupérer les tags de l'objet
            try {
              const tagsCmd = new GetObjectTaggingCommand({
                Bucket: bucket,
                Key: object.Key
              });
              const tagsResponse = await req.s3Client.send(tagsCmd);
              if (tagsResponse.TagSet) {
                tags = tagsResponse.TagSet.reduce((acc, tag) => {
                  if (tag.Key) {
                    acc[tag.Key] = tag.Value || '';
                  }
                  return acc;
                }, {});
              }
            } catch (error) {
              // Tags not available
            }

            objects.push({
              key: fileName,
              lastModified: object.LastModified || new Date(),
              size: object.Size || 0,
              etag: object.ETag || '',
              storageClass: object.StorageClass || 'STANDARD',
              isFolder: false,
              tags
            });
          }
        }
      }
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

// Upload de fichier (avec rate limiting strict)
app.post('/api/buckets/:bucket/objects', strictLimiter, extractCredentials, upload.single('file'), async (req, res) => {
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

// Supprimer un objet (avec rate limiting strict)
app.delete('/api/buckets/:bucket/objects/:key(*)', strictLimiter, extractCredentials, async (req, res) => {
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

// Créer un dossier (avec rate limiting strict)
app.post('/api/buckets/:bucket/folders', strictLimiter, extractCredentials, async (req, res) => {
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

// Configurer le versioning d'un bucket (avec rate limiting strict)
app.put('/api/buckets/:bucket/versioning', strictLimiter, extractCredentials, async (req, res) => {
  try {
    const { bucket } = req.params;
    const { enabled } = req.body;

    const command = new PutBucketVersioningCommand({
      Bucket: bucket,
      VersioningConfiguration: {
        Status: enabled ? 'Enabled' : 'Suspended'
      }
    });

    await req.s3Client.send(command);

    res.json({
      success: true,
      message: `Versioning ${enabled ? 'activé' : 'désactivé'} pour le bucket "${bucket}"`
    });
  } catch (error) {
    console.error('Erreur configuration versioning:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la configuration du versioning',
      message: error.message
    });
  }
});

// Configurer l'encryption d'un bucket (avec rate limiting strict)
app.put('/api/buckets/:bucket/encryption', strictLimiter, extractCredentials, async (req, res) => {
  try {
    const { bucket } = req.params;

    const command = new PutBucketEncryptionCommand({
      Bucket: bucket,
      ServerSideEncryptionConfiguration: {
        Rules: [
          {
            ApplyServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256'
            },
            BucketKeyEnabled: true
          }
        ]
      }
    });

    await req.s3Client.send(command);

    res.json({
      success: true,
      message: `Encryption activée pour le bucket "${bucket}"`
    });
  } catch (error) {
    console.error('Erreur activation encryption:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'activation de l\'encryption',
      message: error.message
    });
  }
});

// Désactiver l'encryption d'un bucket (avec rate limiting strict)
app.delete('/api/buckets/:bucket/encryption', strictLimiter, extractCredentials, async (req, res) => {
  try {
    const { bucket } = req.params;

    const command = new DeleteBucketEncryptionCommand({
      Bucket: bucket
    });

    await req.s3Client.send(command);

    res.json({
      success: true,
      message: `Encryption désactivée pour le bucket "${bucket}"`
    });
  } catch (error) {
    console.error('Erreur désactivation encryption:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la désactivation de l\'encryption',
      message: error.message
    });
  }
});

// Ajouter/Modifier les tags d'un objet (avec rate limiting strict)
app.put('/api/buckets/:bucket/objects/:key(*)/tags', strictLimiter, extractCredentials, async (req, res) => {
  try {
    const { bucket, key } = req.params;
    const { tags } = req.body;

    if (!tags || typeof tags !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Tags requis au format objet'
      });
    }

    const tagSet = Object.entries(tags).map(([Key, Value]) => ({ Key, Value }));

    const command = new PutObjectTaggingCommand({
      Bucket: bucket,
      Key: key,
      Tagging: {
        TagSet: tagSet
      }
    });

    await req.s3Client.send(command);

    res.json({
      success: true,
      message: `Tags mis à jour pour "${key}"`
    });
  } catch (error) {
    console.error('Erreur mise à jour tags:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour des tags',
      message: error.message
    });
  }
});

// Supprimer les tags d'un objet (avec rate limiting strict)
app.delete('/api/buckets/:bucket/objects/:key(*)/tags', strictLimiter, extractCredentials, async (req, res) => {
  try {
    const { bucket, key } = req.params;

    const command = new DeleteObjectTaggingCommand({
      Bucket: bucket,
      Key: key
    });

    await req.s3Client.send(command);

    res.json({
      success: true,
      message: `Tags supprimés pour "${key}"`
    });
  } catch (error) {
    console.error('Erreur suppression tags:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression des tags',
      message: error.message
    });
  }
});

// Lister les versions d'un objet
app.get('/api/buckets/:bucket/versions', extractCredentials, async (req, res) => {
  try {
    const { bucket } = req.params;
    const { prefix } = req.query;

    const command = new ListObjectVersionsCommand({
      Bucket: bucket,
      Prefix: prefix
    });

    const response = await req.s3Client.send(command);
    const versions = [];

    if (response.Versions) {
      response.Versions.forEach(version => {
        if (version.Key) {
          versions.push({
            versionId: version.VersionId || '',
            key: version.Key,
            lastModified: version.LastModified || new Date(),
            size: version.Size || 0,
            etag: version.ETag || '',
            isLatest: version.IsLatest || false,
            storageClass: version.StorageClass || 'STANDARD'
          });
        }
      });
    }

    res.json({ success: true, data: versions });
  } catch (error) {
    console.error('Erreur liste versions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des versions',
      message: error.message
    });
  }
});

// Récupérer la rétention d'un objet
app.get('/api/buckets/:bucket/objects/:key(*)/retention', extractCredentials, async (req, res) => {
  try {
    const { bucket, key } = req.params;
    const { versionId } = req.query;

    const command = new GetObjectRetentionCommand({
      Bucket: bucket,
      Key: key,
      VersionId: versionId
    });

    const response = await req.s3Client.send(command);

    res.json({
      success: true,
      data: {
        mode: response.Retention?.Mode,
        retainUntilDate: response.Retention?.RetainUntilDate
      }
    });
  } catch (error) {
    // Si Object Lock n'est pas configuré sur le bucket ou pas de rétention définie
    if ((error.Code === 'InvalidRequest' && error.message?.includes('Object Lock Configuration')) ||
      error.Code === 'NoSuchObjectLockConfiguration') {
      return res.json({
        success: true,
        data: {
          mode: null,
          retainUntilDate: null
        }
      });
    }

    console.error('Erreur récupération rétention:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la rétention',
      message: error.message
    });
  }
});

// Configurer la rétention d'un objet (avec rate limiting strict)
app.put('/api/buckets/:bucket/objects/:key(*)/retention', strictLimiter, extractCredentials, async (req, res) => {
  try {
    const { bucket, key } = req.params;
    const { versionId } = req.query;
    const { retention } = req.body;

    if (!retention || !retention.mode || !retention.retainUntilDate) {
      return res.status(400).json({
        success: false,
        error: 'Mode et date de rétention requis'
      });
    }

    const command = new PutObjectRetentionCommand({
      Bucket: bucket,
      Key: key,
      VersionId: versionId,
      Retention: {
        Mode: retention.mode,
        RetainUntilDate: new Date(retention.retainUntilDate)
      }
    });

    await req.s3Client.send(command);

    res.json({
      success: true,
      message: `Rétention configurée pour "${key}"`
    });
  } catch (error) {
    console.error('Erreur configuration rétention:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la configuration de la rétention',
      message: error.message
    });
  }
});

// Récupérer la configuration Object Lock d'un bucket
app.get('/api/buckets/:bucket/object-lock', extractCredentials, async (req, res) => {
  try {
    const { bucket } = req.params;

    const command = new GetObjectLockConfigurationCommand({
      Bucket: bucket
    });

    const response = await req.s3Client.send(command);

    res.json({
      success: true,
      data: {
        enabled: response.ObjectLockConfiguration?.ObjectLockEnabled === 'Enabled',
        rule: response.ObjectLockConfiguration?.Rule ? {
          defaultRetention: {
            mode: response.ObjectLockConfiguration.Rule.DefaultRetention?.Mode,
            days: response.ObjectLockConfiguration.Rule.DefaultRetention?.Days,
            years: response.ObjectLockConfiguration.Rule.DefaultRetention?.Years
          }
        } : undefined
      }
    });
  } catch (error) {
    // Si Object Lock n'est pas configuré, retourner une réponse valide au lieu d'une erreur
    if (error.Code === 'ObjectLockConfigurationNotFoundError' ||
      error.name === 'ObjectLockConfigurationNotFoundError') {
      return res.json({
        success: true,
        data: {
          enabled: false,
          rule: undefined
        }
      });
    }

    console.error('Erreur récupération Object Lock config:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la configuration Object Lock',
      message: error.message
    });
  }
});

// Récupérer les ACL d'un objet
app.get('/api/buckets/:bucket/objects/:key(*)/acl', extractCredentials, async (req, res) => {
  try {
    const { bucket, key } = req.params;

    const command = new GetObjectAclCommand({
      Bucket: bucket,
      Key: key
    });

    const response = await req.s3Client.send(command);

    res.json({
      success: true,
      data: {
        owner: response.Owner ? {
          displayName: response.Owner.DisplayName,
          id: response.Owner.ID
        } : null,
        grants: response.Grants?.map(grant => ({
          grantee: {
            type: grant.Grantee?.Type,
            displayName: grant.Grantee?.DisplayName,
            id: grant.Grantee?.ID,
            uri: grant.Grantee?.URI
          },
          permission: grant.Permission
        })) || []
      }
    });
  } catch (error) {
    console.error('Erreur récupération ACL:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des ACL',
      message: error.message
    });
  }
});

// ============================================================
// LIFECYCLE CONFIGURATION
// ============================================================

// GET /api/buckets/:bucket/lifecycle - Récupérer configuration lifecycle
app.get('/api/buckets/:bucket/lifecycle', extractCredentials, async (req, res) => {
  try {
    const { bucket } = req.params;
    
    const command = new GetBucketLifecycleConfigurationCommand({
      Bucket: bucket
    });

    const response = await req.s3Client.send(command);
    
    res.json({
      success: true,
      data: {
        rules: response.Rules || []
      }
    });
  } catch (error) {
    if (error.name === 'NoSuchLifecycleConfiguration') {
      return res.json({
        success: true,
        data: { rules: [] }
      });
    }
    console.error('Erreur récupération lifecycle:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la configuration lifecycle'
    });
  }
});

// PUT /api/buckets/:bucket/lifecycle - Configurer lifecycle
app.put('/api/buckets/:bucket/lifecycle', strictLimiter, extractCredentials, async (req, res) => {
  try {
    const { bucket } = req.params;
    const { configuration } = req.body;
    
    const command = new PutBucketLifecycleConfigurationCommand({
      Bucket: bucket,
      LifecycleConfiguration: configuration
    });

    await req.s3Client.send(command);
    
    res.json({
      success: true,
      message: 'Configuration lifecycle mise à jour'
    });
  } catch (error) {
    console.error('Erreur configuration lifecycle:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la configuration lifecycle'
    });
  }
});

// DELETE /api/buckets/:bucket/lifecycle - Supprimer configuration lifecycle
app.delete('/api/buckets/:bucket/lifecycle', strictLimiter, extractCredentials, async (req, res) => {
  try {
    const { bucket } = req.params;
    
    const command = new DeleteBucketLifecycleCommand({
      Bucket: bucket
    });

    await req.s3Client.send(command);
    
    res.json({
      success: true,
      message: 'Configuration lifecycle supprimée'
    });
  } catch (error) {
    console.error('Erreur suppression lifecycle:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la configuration lifecycle'
    });
  }
});

// ============================================================
// HEAD OPERATIONS
// ============================================================

// GET /api/buckets/:bucket/head - Vérifier bucket
app.get('/api/buckets/:bucket/head', extractCredentials, async (req, res) => {
  try {
    const { bucket } = req.params;
    
    const command = new HeadBucketCommand({
      Bucket: bucket
    });

    await req.s3Client.send(command);
    
    res.json({
      success: true,
      data: {
        exists: true
      }
    });
  } catch (error) {
    if (error.name === 'NotFound') {
      return res.json({
        success: true,
        data: { exists: false }
      });
    }
    console.error('Erreur head bucket:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification du bucket'
    });
  }
});

// GET /api/buckets/:bucket/objects/:key(*)/head - Vérifier objet
app.get('/api/buckets/:bucket/objects/:key(*)/head', extractCredentials, async (req, res) => {
  try {
    const { bucket, key } = req.params;
    
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const response = await req.s3Client.send(command);
    
    res.json({
      success: true,
      data: {
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        etag: response.ETag,
        versionId: response.VersionId,
        metadata: response.Metadata
      }
    });
  } catch (error) {
    if (error.name === 'NotFound') {
      return res.json({
        success: true,
        data: { exists: false }
      });
    }
    console.error('Erreur head object:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification de l\'objet'
    });
  }
});

// ============================================================
// PRESIGNED URLS
// ============================================================

// GET /api/buckets/:bucket/objects/:key(*)/presigned - Générer URL pré-signée
app.get('/api/buckets/:bucket/objects/:key(*)/presigned', extractCredentials, async (req, res) => {
  try {
    const { bucket, key } = req.params;
    const expiresIn = parseInt(req.query.expiresIn) || 3600;
    
    // Limiter à 1 semaine max
    if (expiresIn > 604800) {
      return res.status(400).json({
        success: false,
        error: 'Durée d\'expiration trop longue (max 604800 secondes)'
      });
    }
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const url = await getSignedUrl(req.s3Client, command, { expiresIn });
    
    res.json({
      success: true,
      data: { url }
    });
  } catch (error) {
    console.error('Erreur génération URL pré-signée:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération de l\'URL pré-signée'
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
  console.log(`   POST   /api/buckets (rate limited)`);
  console.log(`   DELETE /api/buckets/:name (rate limited)`);
  console.log(`   GET    /api/buckets/:bucket/objects`);
  console.log(`   POST   /api/buckets/:bucket/objects (upload, rate limited)`);
  console.log(`   DELETE /api/buckets/:bucket/objects/:key (rate limited)`);
  console.log(`   POST   /api/buckets/:bucket/folders (rate limited)`);
  console.log(`   GET    /api/buckets/:bucket/objects/:key/download`);
  console.log('');
  console.log('🔒 Sécurité:');
  console.log(`   ✓ Rate limiting activé (${process.env.RATE_LIMIT_MAX_REQUESTS || 100} req/15min)`);
  console.log(`   ✓ Rate limiting strict (${process.env.RATE_LIMIT_STRICT_MAX_REQUESTS || 20} req/5min pour écriture)`);
  console.log('   ✓ Headers de sécurité (CSP, HSTS, X-Frame-Options)');
  console.log('   ✓ Validation des credentials');
  console.log('');
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  PRODUCTION: Assurez-vous d\'utiliser HTTPS (reverse proxy Nginx/HAProxy)');
  } else {
    console.log('💡 DEV MODE: N\'oubliez pas d\'activer HTTPS en production!');
  }
});