# Guide d'installation pour le projet mean_table

## Prérequis

Avant de commencer, assurez-vous d'avoir les éléments suivants installés sur votre machine :

1. **Node.js** (version LTS recommandée)

Vous pouvez l'installer depuis [nodejs.org](https://nodejs.org/).

2. **npm** (fourni avec Node.js) ou **Yarn**

Si vous souhaitez utiliser Yarn, vous pouvez l'installer globalement avec :

```bash

npm install -g yarn

```

3. **MongoDB**

Installez PostgreSQL depuis postgresql.org

4. **Angular CLI** 

Installez Angular CLI globalement avec :

```bash

npm install -g @angular/cli

```

---

## Étapes d'installation

### 1. Clonez le dépôt

Clonez le dépôt sur votre machine locale en utilisant Git :

```bash

git clone https://github.com/feywilddd/mean-table-scheduler.git

cd mean-table-scheduler\src

```

### 2. Installez les dépendances du backend

Naviguez vers le répertoire backend et installez les dépendances requises en utilisant npm ou Yarn :

```bash

cd backend

npm install

# ou si vous utilisez Yarn

yarn install

```

### 3. Installez les dépendances du frontend

Naviguez vers le répertoire frontend et installez les dépendances requises :

```bash

cd ../frontend

npm install

# ou si vous utilisez Yarn

yarn install

```

### 4. Configurez les variables d'environnement

Si votre projet utilise des variables d'environnement (par exemple pour MongoDB ou d'autres configurations), créez un fichier `.env` à la racine de votre projet et ajoutez les valeurs nécessaires. Voici un exemple :

```env
PORT=3000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=mean_table
DB_PASS=hjkba
DB_PORT=5432
```

Remplacez les valeurs par vos configurations réelles.

### 5. Démarrez PostgreSQL

Lancez votre instance locale de PostgreSQL.
Si vous utilisez une instance cloud, assurez-vous simplement que votre fichier .env contient la bonne chaîne de connexion.

### 6. Démarrez le serveur backend

Démarrez le serveur backend :

```bash

cd backend

npm start

# ou si vous utilisez Yarn

yarn start

```

Le serveur backend devrait maintenant être en cours d'exécution sur le port configuré (par défaut : 5000).

### 7. Démarrez l'application frontend

Démarrez l'application frontend (en supposant qu'il s'agisse d'une application Angular) :

```bash

cd frontend

ng serve

```

L'application Angular sera accessible sur [http://localhost:4200](http://localhost:4200).

---

## Accédez à l'application

- **Frontend** : Ouvrez [http://localhost:4200](http://localhost:4200) dans votre navigateur.

- **Backend** : L'API devrait être accessible sur [http://localhost:3000](http://localhost:3000) ou sur le port configuré.

---

## Dépannage

- **Dépendances manquantes** : Si vous rencontrez des erreurs concernant des modules manquants, exécutez à nouveau `npm install` ou `yarn install` dans le répertoire concerné.

- **Conflits de ports** : Si un port est déjà utilisé, modifiez le numéro de port dans le fichier `.env` ou dans la configuration de l'application.

---

## Notes supplémentaires

- Si vous modifiez les variables d'environnement, redémarrez les serveurs frontend et backend pour appliquer les changements.

- Pour une mise en production, vous pouvez construire le frontend Angular avec :

```bash

ng build

```
