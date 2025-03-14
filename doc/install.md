Here's the Markdown code you can copy directly:

```markdown
# Guide d'installation pour le projet mean_table avec Docker

## Prérequis
Avant de commencer, assurez-vous d'avoir les éléments suivants installés sur votre machine :
1. **Docker** et **Docker Compose**
   - Installez Docker depuis [docker.com](https://www.docker.com/products/docker-desktop)
   - Docker Compose est généralement inclus avec l'installation de Docker Desktop

2. **Git**
   - Nécessaire pour cloner le dépôt

---

## Installation et lancement avec Docker

### 1. Clonez le dépôt
Clonez le dépôt sur votre machine locale en utilisant Git :
```bash
git clone https://github.com/feywilddd/mean-table-scheduler.git
cd mean-table-scheduler
```

### 2. Accédez au répertoire source
```bash
cd src
```

### 3. Créez le fichier .env
Créez un fichier `.env` dans le répertoire `src` avec le contenu suivant :
```env
PORT=3000
DB_USER=postgres
DB_HOST=postgres
DB_NAME=mean_table
DB_PASS=UlGBqeXlkG
DB_PORT=5444
JWT_SECRET=your-super-secret-key-should-be-long-and-complex
JWT_EXPIRY=24h
```

### 4. Installation des dépendances
Exécutez d'abord Docker Compose avec les commandes d'installation (décommentez les commandes d'installation et commentez les commandes de lancement) :

```bash
# Décommentez les commandes d'installation et commentez les commandes de lancemen dans le docker-compose.yml
# Puis exécutez :
docker-compose up
```

Ces commandes vont installer toutes les dépendances nécessaires :
- Pour le backend : bcrypt, cors, dotenv, express, helmet, jsonwebtoken, morgan, nodaemon, pg, pg-hstore, sequelize
- Pour le frontend : Angular CLI, bootstrap, rxjs, zone.js, tslib

### 5. Lancement de l'application
Une fois l'installation terminée, arrêtez les conteneurs (Ctrl+C), puis recommentez les commandes d'installation et décommentez les commandes de lancement dans le docker-compose.yml, puis relancez :

```bash
# Recommentez les commandes d'installation et décommentez les commandes de lancement dans le docker-compose.yml
# Puis exécutez à nouveau :
docker-compose up
```

Les trois services devraient maintenant démarrer :
- **postgres** : La base de données PostgreSQL (port 5444)
- **backend** : Le serveur Node.js (port 3000)
- **frontend** : L'application Angular (port 4200)

## Accès à l'application

- **Frontend** : Ouvrez [http://localhost:4200](http://localhost:4200) dans votre navigateur.
- **Backend API** : Accessible sur [http://localhost:3000](http://localhost:3000)
- **Base de données** : PostgreSQL accessible sur le port 5444

---

## Détails des services Docker

### Base de données PostgreSQL
- **Port** : 5444 (externe), 5432 (interne)
- **Utilisateur** : postgres
- **Mot de passe** : UlGBqeXlkG
- **Base de données** : mean_table
- **Scripts d'initialisation** :
  - `init.sql` : Création des tables
  - `dummyValues.sql` : Données de test

### Backend Node.js
- **Port** : 3000
- **Dépendances** : express, pg, dotenv, cors, helmet, morgan, bcrypt, etc.
- **Point d'entrée** : npm start
- **Tests** : src\backend> npx mocha services/reservation.test.js

### Frontend Angular
- **Port** : 4200
- **Configuration** : Poll activé (2000ms) pour détecter les changements de fichiers

---

## Dépannage

- **Erreur de connexion à la base de données** : Assurez-vous que le service PostgreSQL est bien démarré avant le backend
- **Problèmes de permissions** : Si vous rencontrez des problèmes de permissions avec les volumes Docker, exécutez les commandes avec `sudo` (Linux/Mac)
- **Ports déjà utilisés** : Si les ports sont déjà utilisés, modifiez-les dans le fichier `docker-compose.yml`
- **Installation des dépendances** : Si vous rencontrez des problèmes avec l'installation des dépendances, vous pouvez les installer manuellement en exécutant les commandes dans un shell Docker :
  ```bash
  docker-compose exec backend bash
  npm install bcrypt cors dotenv express helmet jsonwebtoken morgan nodaemon pg pg-hstore sequelize
  ```

---

## Notes supplémentaires

- Les données PostgreSQL sont persistantes grâce au volume `postgres-data`
- Pour reconstruire complètement les conteneurs : `docker-compose down -v && docker-compose up --build`
- Pour exécuter les conteneurs en arrière-plan : `docker-compose up -d`
- Pour voir les logs : `docker-compose logs -f`
```