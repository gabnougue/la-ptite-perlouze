const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.db');

const rawDb = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err.message);
  } else {
    console.log('✨ Connexion à la base de données réussie');
  }
});

// Wrapper qui supporte à la fois callbacks et promises
const db = {
  // Méthode all : supporte callback et promise
  all: function(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    if (callback) {
      return rawDb.all(sql, params, callback);
    } else {
      return new Promise((resolve, reject) => {
        rawDb.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  },

  // Méthode get : supporte callback et promise
  get: function(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    if (callback) {
      return rawDb.get(sql, params, callback);
    } else {
      return new Promise((resolve, reject) => {
        rawDb.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }
  },

  // Méthode run : supporte callback et promise
  run: function(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    if (callback) {
      return rawDb.run(sql, params, callback);
    } else {
      return new Promise((resolve, reject) => {
        rawDb.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, changes: this.changes });
        });
      });
    }
  },

  // Méthode close
  close: function(callback) {
    if (callback) {
      return rawDb.close(callback);
    } else {
      return new Promise((resolve, reject) => {
        rawDb.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }
};

module.exports = db;
