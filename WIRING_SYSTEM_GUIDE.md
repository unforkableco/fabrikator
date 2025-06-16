# 🔌 Guide du Système de Câblage - Fabrikator

## ✅ Fonctionnalités Implémentées

### 🎨 **Éditeur de Câblage SVG**
- **Éditeur SVG natif** sans dépendances externes problématiques
- **Rendu en temps réel** des composants et connexions
- **Glisser-déposer** des composants sur le canevas
- **Connexions interactives** entre les broches des composants

### 🧩 **Gestion des Composants**
- **Conversion automatique** des matériaux en composants de câblage
- **Broches typées** (power, ground, digital, analog)
- **Modèles de composants** basés sur le type (Microcontroller, Sensor, etc.)
- **Positionnement libre** sur le canevas avec drag & drop

### 🔗 **Système de Connexions**
- **Connexions point-à-point** entre broches
- **Types de fils** différenciés (alimentation, masse, données, etc.)
- **Couleurs automatiques** selon le type de connexion
- **Validation en temps réel** des connexions

### ✅ **Validation Intelligente**
- **Vérification de compatibilité** des tensions
- **Détection des connexions invalides**
- **Avertissements et erreurs** avec suggestions de correction
- **Panneau de validation** avec détails des problèmes

### 💬 **Agent IA Spécialisé**
- **Chat intégré** comme pour les matériaux
- **Mode Ask** pour questions sur le câblage
- **Mode Agent** pour génération de suggestions de connexions
- **Suggestions contextuelles** basées sur les composants disponibles

### 📋 **Liste des Connexions**
- **Vue détaillée** de toutes les connexions
- **Édition en ligne** des propriétés (type, couleur, étiquette)
- **Résumé statistique** des connexions
- **Synchronisation** avec le schéma visuel

## 🏗️ **Architecture Technique**

### Frontend (`src/features/projects/components/wiring/`)
```
wiring/
├── WiringPanel.tsx          # Composant principal
├── WiringEditor.tsx         # Éditeur SVG
├── ConnectionsList.tsx      # Liste des connexions
├── WiringValidationPanel.tsx # Panneau de validation
└── index.ts                 # Exports
```

### Backend (`backend/src/modules/wiring/`)
```
wiring/
├── wiring.controller.ts     # Contrôleur API
├── wiring.service.ts        # Logique métier
└── wiring.router.ts         # Routes Express
```

### Types (`src/shared/types/index.ts`)
```typescript
interface WiringDiagram {
  id: string;
  components: WiringComponent[];
  connections: WiringConnection[];
  metadata: DiagramMetadata;
  validation?: WiringValidationResult;
}

interface WiringComponent {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  pins: WiringPin[];
  materialId?: string;
}

interface WiringConnection {
  id: string;
  fromComponent: string;
  fromPin: string;
  toComponent: string;
  toPin: string;
  wireType: 'data' | 'power' | 'ground' | 'analog' | 'digital';
  wireColor?: string;
  label?: string;
  validated?: boolean;
  error?: string;
}
```

## 🔌 **API Endpoints**

### Gestion des Schémas
```typescript
GET    /api/wiring/project/:projectId        # Récupérer le schéma
POST   /api/wiring/project/:projectId        # Créer un nouveau schéma
PUT    /api/wiring/:id                       # Ajouter une version
GET    /api/wiring/:id/versions              # Récupérer les versions
```

### IA et Validation
```typescript
POST   /api/wiring/project/:projectId/suggestions  # Générer suggestions IA
POST   /api/wiring/project/:projectId/validate     # Valider le schéma
```

## 🚀 **Utilisation**

### Composant WiringPanel
```typescript
<WiringPanel
  wiringDiagram={wiringDiagram}
  isLoading={wiringLoading}
  projectId={projectId}
  materials={materials}
  onWiringUpdated={refreshWiring}
/>
```

### Hook useWiring
```typescript
const { 
  wiringDiagram,
  isLoading,
  refreshWiring,
  addComponent,
  addConnection,
  updateConnection,
  deleteConnection
} = useWiring(projectId);
```

## 🎯 **Workflow Complet**

1. **Ajout de Composants** : Cliquer sur un matériau pour l'ajouter au schéma
2. **Positionnement** : Glisser-déposer les composants sur le canevas
3. **Connexions** : Cliquer sur une broche source, puis sur une broche destination
4. **Validation** : Utiliser le bouton "Valider" pour vérifier le schéma
5. **Chat IA** : Demander des suggestions ou poser des questions
6. **Liste des Connexions** : Visualiser et modifier les détails sous le schéma

## 🔧 **Fonctionnalités Avancées**

### Types de Broches
- **Power** : Alimentation (rouge)
- **Ground** : Masse (noir)
- **Digital** : Signal numérique (vert)
- **Analog** : Signal analogique (orange)
- **Data** : Données génériques (bleu)

### Validation Automatique
- **Incompatibilités de tension** : Détection automatique
- **Connexions manquantes** : Suggestions de complétion
- **Meilleures pratiques** : Recommandations d'optimisation

### Chat IA Spécialisé
- **Contexte câblage** : Questions spécifiques au câblage
- **Génération automatique** : Suggestions basées sur les composants
- **Persistance** : Messages sauvegardés dans la base de données

## 📊 **Persistance des Données**

### Base de Données (Prisma)
```sql
-- Schéma de câblage principal
model WiringSchema {
  id               String         @id @default(uuid)
  projectId        String         @db.Uuid
  currentVersionId String?        @db.Uuid
  versions         WireVersion[]
  currentVersion   WireVersion?   @relation("currentWireVersion")
}

-- Versions des schémas
model WireVersion {
  id             String         @id @default(uuid)
  wiringSchemaId String         @db.Uuid
  versionNumber  Int
  createdBy      String
  wiringData     Json           -- Contient components et connections
  createdAt      DateTime       @default(now())
}

-- Messages de chat avec contexte 'wiring'
model Message {
  id          String   @id @default(uuid)
  projectId   String   @db.Uuid
  context     String   -- 'wiring'
  content     String
  sender      String   -- 'user' ou 'ai'
  mode        String   -- 'ask' ou 'agent'
  suggestions Json?    -- Suggestions de câblage
  createdAt   DateTime @default(now())
}
```

## 🎨 **Interface Utilisateur**

### Layout Principal
- **Éditeur de schéma** : 66% de la largeur (gauche)
- **Chat IA** : 33% de la largeur (droite)
- **Liste des connexions** : Sous l'éditeur
- **Panneau de validation** : Affiché conditionnellement

### Interactions
- **Clic simple** : Sélection d'éléments
- **Glisser-déposer** : Déplacement des composants
- **Clic sur broche** : Début/fin de connexion
- **Clic droit** : Menu contextuel (à implémenter)

### Couleurs et Thème
- **Composants sélectionnés** : Bleu primary
- **Connexions avec erreur** : Rouge avec pointillés
- **Types de fils** : Couleurs sémantiques
- **Grid de fond** : Points gris discrets

## 🚀 **Extensions Futures**

### Fonctionnalités Avancées
- **Import/Export** : Formats Eagle, KiCad, Fritzing
- **Bibliothèque de composants** : Base de données enrichie
- **Calculs électriques** : Résistances, capacités, etc.
- **Simulation** : Validation fonctionnelle avancée

### Intégrations
- **Générateur de PCB** : Export vers outils de routage
- **Liste de matériel** : BOM automatique
- **Documentation** : Export PDF avec schémas annotés

Ce système de câblage offre une solution complète et intuitive pour la conception de circuits électroniques avec assistance IA intégrée et validation en temps réel. 