/**
 * Service de stockage SQLite pour l'historique des actions
 * Persistance des actions utilisateur à travers les sessions
 */

const Database = require('better-sqlite3');
const path = require('path');

class HistoryStorage {
  constructor() {
    // Base de données dans le dossier data
    const dbPath = path.join(__dirname, 'data', 'history.db');
    
    // Créer le dossier data s'il n'existe pas
    const fs = require('fs');
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Meilleure performance
    
    this.initDatabase();
    console.log('📦 Base de données historique initialisée:', dbPath);
  }

  /**
   * Initialise le schéma de la base de données
   */
  initDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS action_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        operation_type TEXT NOT NULL,
        status TEXT NOT NULL,
        bucket_name TEXT,
        object_name TEXT,
        details TEXT,
        error_code TEXT,
        progress REAL,
        log_level TEXT NOT NULL,
        user_friendly_message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_user_timestamp 
      ON action_history(user_id, timestamp DESC);

      CREATE INDEX IF NOT EXISTS idx_user_operation 
      ON action_history(user_id, operation_type);

      CREATE INDEX IF NOT EXISTS idx_user_status 
      ON action_history(user_id, status);

      -- Table pour les préférences utilisateur (logging activé/désactivé)
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        is_logging_enabled INTEGER DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Ajoute une entrée à l'historique
   */
  addEntry(entry) {
    const stmt = this.db.prepare(`
      INSERT INTO action_history (
        id, user_id, timestamp, operation_type, status,
        bucket_name, object_name, details, error_code, progress,
        log_level, user_friendly_message
      ) VALUES (
        @id, @user_id, @timestamp, @operation_type, @status,
        @bucket_name, @object_name, @details, @error_code, @progress,
        @log_level, @user_friendly_message
      )
    `);

    try {
      stmt.run({
        id: entry.id,
        user_id: entry.userId,
        timestamp: entry.timestamp,
        operation_type: entry.operationType,
        status: entry.status,
        bucket_name: entry.bucketName || null,
        object_name: entry.objectName || null,
        details: entry.details || null,
        error_code: entry.errorCode || null,
        progress: entry.progress || null,
        log_level: entry.logLevel,
        user_friendly_message: entry.userFriendlyMessage
      });
      return { success: true };
    } catch (error) {
      console.error('Erreur ajout historique:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Met à jour une entrée existante
   */
  updateEntry(id, userId, updates) {
    const allowedFields = ['status', 'details', 'error_code', 'progress', 'log_level', 'user_friendly_message'];
    const updateParts = [];
    const params = { id, user_id: userId };

    for (const [key, value] of Object.entries(updates)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase(); // camelCase to snake_case
      if (allowedFields.includes(dbField)) {
        updateParts.push(`${dbField} = @${dbField}`);
        params[dbField] = value;
      }
    }

    if (updateParts.length === 0) {
      return { success: false, error: 'Aucun champ valide à mettre à jour' };
    }

    const stmt = this.db.prepare(`
      UPDATE action_history 
      SET ${updateParts.join(', ')}
      WHERE id = @id AND user_id = @user_id
    `);

    try {
      const result = stmt.run(params);
      return { success: result.changes > 0 };
    } catch (error) {
      console.error('Erreur mise à jour historique:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupère l'historique d'un utilisateur
   */
  getEntries(userId, options = {}) {
    const { 
      limit = 100, 
      offset = 0, 
      operationType, 
      status, 
      startDate, 
      endDate,
      search 
    } = options;

    let query = `SELECT * FROM action_history WHERE user_id = ?`;
    const params = [userId];

    if (operationType) {
      query += ` AND operation_type = ?`;
      params.push(operationType);
    }

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (startDate) {
      query += ` AND timestamp >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND timestamp <= ?`;
      params.push(endDate);
    }

    if (search) {
      query += ` AND (
        bucket_name LIKE ? OR 
        object_name LIKE ? OR 
        user_friendly_message LIKE ? OR
        details LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    try {
      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);
      
      // Convertir snake_case vers camelCase
      return rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        operationType: row.operation_type,
        status: row.status,
        bucketName: row.bucket_name,
        objectName: row.object_name,
        details: row.details,
        errorCode: row.error_code,
        progress: row.progress,
        logLevel: row.log_level,
        userFriendlyMessage: row.user_friendly_message
      }));
    } catch (error) {
      console.error('Erreur récupération historique:', error);
      return [];
    }
  }

  /**
   * Compte le nombre total d'entrées pour un utilisateur
   */
  countEntries(userId, options = {}) {
    const { operationType, status, startDate, endDate, search } = options;

    let query = `SELECT COUNT(*) as count FROM action_history WHERE user_id = ?`;
    const params = [userId];

    if (operationType) {
      query += ` AND operation_type = ?`;
      params.push(operationType);
    }

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (startDate) {
      query += ` AND timestamp >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND timestamp <= ?`;
      params.push(endDate);
    }

    if (search) {
      query += ` AND (
        bucket_name LIKE ? OR 
        object_name LIKE ? OR 
        user_friendly_message LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    try {
      const stmt = this.db.prepare(query);
      const result = stmt.get(...params);
      return result.count;
    } catch (error) {
      console.error('Erreur comptage historique:', error);
      return 0;
    }
  }

  /**
   * Supprime l'historique d'un utilisateur
   */
  clearHistory(userId) {
    try {
      const stmt = this.db.prepare(`DELETE FROM action_history WHERE user_id = ?`);
      const result = stmt.run(userId);
      return { success: true, deletedCount: result.changes };
    } catch (error) {
      console.error('Erreur suppression historique:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Supprime les entrées plus anciennes que X jours
   */
  cleanupOldEntries(daysToKeep = 30) {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM action_history 
        WHERE timestamp < datetime('now', '-' || ? || ' days')
      `);
      const result = stmt.run(daysToKeep);
      console.log(`🧹 Nettoyage: ${result.changes} entrées supprimées (> ${daysToKeep} jours)`);
      return { success: true, deletedCount: result.changes };
    } catch (error) {
      console.error('Erreur nettoyage historique:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupère les préférences utilisateur
   */
  getUserPreferences(userId) {
    try {
      const stmt = this.db.prepare(`SELECT * FROM user_preferences WHERE user_id = ?`);
      const result = stmt.get(userId);
      
      if (result) {
        return {
          isLoggingEnabled: result.is_logging_enabled === 1
        };
      }
      
      // Créer les préférences par défaut
      this.setUserPreferences(userId, { isLoggingEnabled: true });
      return { isLoggingEnabled: true };
    } catch (error) {
      console.error('Erreur récupération préférences:', error);
      return { isLoggingEnabled: true };
    }
  }

  /**
   * Met à jour les préférences utilisateur
   */
  setUserPreferences(userId, preferences) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_preferences (user_id, is_logging_enabled, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          is_logging_enabled = excluded.is_logging_enabled,
          updated_at = datetime('now')
      `);
      stmt.run(userId, preferences.isLoggingEnabled ? 1 : 0);
      return { success: true };
    } catch (error) {
      console.error('Erreur mise à jour préférences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Statistiques de l'historique
   */
  getStats(userId) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
          COUNT(DISTINCT operation_type) as operation_types,
          COUNT(DISTINCT bucket_name) as buckets_used
        FROM action_history 
        WHERE user_id = ?
      `);
      const result = stmt.get(userId);
      
      // Récupérer les opérations les plus fréquentes
      const topOpsStmt = this.db.prepare(`
        SELECT operation_type, COUNT(*) as count
        FROM action_history
        WHERE user_id = ?
        GROUP BY operation_type
        ORDER BY count DESC
        LIMIT 5
      `);
      const topOperations = topOpsStmt.all(userId);

      return {
        total: result.total,
        successCount: result.success_count,
        errorCount: result.error_count,
        operationTypes: result.operation_types,
        bucketsUsed: result.buckets_used,
        topOperations: topOperations.map(op => ({
          operationType: op.operation_type,
          count: op.count
        }))
      };
    } catch (error) {
      console.error('Erreur statistiques:', error);
      return null;
    }
  }

  /**
   * Synchronisation en lot (pour import depuis localStorage)
   */
  bulkInsert(entries) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO action_history (
        id, user_id, timestamp, operation_type, status,
        bucket_name, object_name, details, error_code, progress,
        log_level, user_friendly_message
      ) VALUES (
        @id, @user_id, @timestamp, @operation_type, @status,
        @bucket_name, @object_name, @details, @error_code, @progress,
        @log_level, @user_friendly_message
      )
    `);

    const insertMany = this.db.transaction((entries) => {
      let inserted = 0;
      for (const entry of entries) {
        try {
          stmt.run({
            id: entry.id,
            user_id: entry.userId,
            timestamp: entry.timestamp,
            operation_type: entry.operationType,
            status: entry.status,
            bucket_name: entry.bucketName || null,
            object_name: entry.objectName || null,
            details: entry.details || null,
            error_code: entry.errorCode || null,
            progress: entry.progress || null,
            log_level: entry.logLevel,
            user_friendly_message: entry.userFriendlyMessage
          });
          inserted++;
        } catch (e) {
          // Ignorer les doublons
        }
      }
      return inserted;
    });

    try {
      const count = insertMany(entries);
      return { success: true, insertedCount: count };
    } catch (error) {
      console.error('Erreur insertion en lot:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ferme la connexion à la base de données
   */
  close() {
    this.db.close();
    console.log('📦 Base de données historique fermée');
  }
}

// Instance singleton
let instance = null;

module.exports = {
  getHistoryStorage: () => {
    if (!instance) {
      instance = new HistoryStorage();
    }
    return instance;
  },
  HistoryStorage
};
