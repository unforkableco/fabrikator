# Guide des Références de Produits - Fabrikator

## Vue d'ensemble

Cette fonctionnalité permet à l'IA de suggérer des références de produits spécifiques avec des liens d'achat pour chaque composant d'un projet. L'objectif est de faciliter l'approvisionnement tout en gardant l'esprit DIY de Forge.

## Nouvelles Fonctionnalités

### 1. Suggestions de Références de Produit par l'IA

L'IA suggère maintenant pour chaque composant :
- **Nom exact du produit** et numéro de modèle
- **Fabricant/marque**
- **Lien d'achat direct** (Adafruit, SparkFun, Amazon, AliExpress, etc.)
- **Prix approximatif** avec devise
- **Fournisseur** (nom du magasin)
- **Numéro de pièce** fabricant (optionnel)
- **Lien vers la datasheet** (optionnel)

### 2. Spécifications Techniques Basées sur Produits Réels

Les spécifications techniques de chaque composant sont désormais basées sur la référence de produit suggérée par l'IA, garantissant :
- Précision des caractéristiques techniques
- Cohérence avec les produits disponibles
- Fiabilité des informations

### 3. Interface Utilisateur Améliorée

Le composant `MaterialCard` affiche maintenant :
- Section "Référence Produit Suggérée" avec :
  - Chips colorés pour fabricant, prix et fournisseur
  - Bouton "Rechercher & Acheter" avec lien externe
  - Bouton "Datasheet" si disponible
  - Design responsive et moderne

### 4. 🆕 Liens de Recherche Dynamiques et Fiables

**Problème résolu** : Les liens directs générés par l'IA étaient souvent morts ou obsolètes.

**Solution** : Génération automatique de liens de recherche dynamiques qui fonctionnent vraiment :

#### Comment ça marche :
1. **Extraction du nom du produit** depuis la référence IA
2. **Ajout de mots-clés contextuels** selon le type de composant
3. **Génération d'URLs de recherche** vers les vrais sites des fournisseurs
4. **Fallback vers Google** si le fournisseur n'est pas reconnu

#### Fournisseurs supportés :
- **Amazon** : `https://www.amazon.com/s?k=[produit]`
- **Adafruit** : `https://www.adafruit.com/search?q=[produit]`
- **SparkFun** : `https://www.sparkfun.com/search/results?term=[produit]`
- **AliExpress** : `https://www.aliexpress.com/wholesale?SearchText=[produit]`
- **Mouser** : `https://www.mouser.com/c/?q=[produit]`
- **DigiKey** : `https://www.digikey.com/products/en?keywords=[produit]`

#### Mots-clés contextuels ajoutés :
- **Sensors** → `+ sensor module`
- **Microcontrollers** → `+ development board`
- **Power/Battery** → `+ power supply`
- **Displays** → `+ display module`

#### Exemple :
```typescript
// Référence IA : "Arduino Uno R3" + "Amazon"
// Lien généré : https://www.amazon.com/s?k=Arduino%20Uno%20R3%20development%20board
```

## Structure des Données

### Interface ProductReference (TypeScript)

```typescript
export interface ProductReference {
  name: string;           // "ESP32 DevKit V1"
  manufacturer: string;   // "Espressif"
  purchaseUrl: string;    // "https://www.adafruit.com/product/3405"
  estimatedPrice: string; // "$9.95 USD"
  supplier: string;       // "Adafruit"
  partNumber?: string;    // "ESP32-DEVKITV1"
  datasheet?: string;     // "https://docs.espressif.com/..."
}
```

### Stockage en Base de Données

Les informations de référence de produit sont stockées dans le champ `specs` JSON du modèle `CompVersion` :

```json
{
  "name": "ESP32 Microcontroller",
  "type": "Microcontroller",
  "quantity": 1,
  "requirements": {
    "voltage": "3.3V",
    "frequency": "240MHz",
    "memory": "520KB SRAM"
  },
  "productReference": {
    "name": "ESP32 DevKit V1",
    "manufacturer": "Espressif",
    "purchaseUrl": "https://www.adafruit.com/product/3405",
    "estimatedPrice": "$9.95 USD",
    "supplier": "Adafruit",
    "partNumber": "ESP32-DEVKITV1",
    "datasheet": "https://docs.espressif.com/projects/esp-idf/en/latest/esp32/"
  }
}
```

## Modifications Apportées

### Backend

#### 1. Prompt IA Modifié (`backend/src/config/prompts.ts`)
- ✅ Ajout de la section "PRODUCT REFERENCES"
- ✅ Instructions pour suggérer des produits réels avec liens d'achat
- ✅ Préférence pour les fournisseurs réputés
- ✅ **Nouveau** : Guide des noms de produits réalistes et recherchables

#### 2. Service AI (`backend/src/services/ai.service.ts`)
- ✅ Support de la propriété `productReference` 
- ✅ **Nouveau** : Fonction `cleanJsonResponse()` pour parser le JSON de l'IA
- ✅ **Nouveau** : Correction automatique des valeurs malformées (comme `5W` → `"5W"`)

#### 3. Service des Matériaux (`backend/src/modules/material/material.service.ts`)
- ✅ Support de la propriété `productReference` dans `createMaterial`
- ✅ Support de la propriété `productReference` dans `addVersion`

#### 4. Contrôleur des Matériaux (`backend/src/modules/material/material.controller.ts`)
- ✅ Traitement des données `productReference` lors des suggestions IA
- ✅ Transformation des réponses pour inclure les références de produit

### Frontend

#### 1. Types TypeScript (`src/shared/types/index.ts`)
- ✅ Nouvelle interface `ProductReference`
- ✅ Ajout de `productReference?: ProductReference` à l'interface `Material`

#### 2. Composant MaterialCard (`src/features/projects/components/materials/MaterialCard.tsx`)
- ✅ Section "Référence Produit Suggérée"
- ✅ **Nouveau** : Fonction `generateWorkingPurchaseUrl()` pour liens de recherche fiables
- ✅ **Nouveau** : Bouton "Rechercher & Acheter" au lieu de "Acheter"
- ✅ **Nouveau** : Tooltip explicatif avec nom du produit et fournisseur
- ✅ Chips informatifs pour fabricant, prix et fournisseur
- ✅ Boutons de datasheet avec liens externes

## Utilisation

### Pour l'Utilisateur

1. **Génération de suggestions** : L'IA suggère automatiquement des références de produit
2. **Visualisation** : Chaque composant affiche sa référence de produit suggérée
3. **🆕 Recherche facilitée** : Clic sur "Rechercher & Acheter" pour accéder aux résultats de recherche sur le site du fournisseur
4. **Documentation technique** : Accès direct aux datasheets quand disponibles

### Pour les Développeurs

```typescript
// Exemple d'utilisation dans le frontend
const productReference = material.productReference;
if (productReference) {
  console.log(`Produit: ${productReference.name}`);
  console.log(`Prix: ${productReference.estimatedPrice}`);
  
  // Génération automatique de lien de recherche fiable
  const searchUrl = generateWorkingPurchaseUrl(productReference);
  console.log(`Lien de recherche: ${searchUrl}`);
}
```

## Fournisseurs Préférés

L'IA privilégie ces fournisseurs pour les liens d'achat :
- **Adafruit** - Composants électroniques DIY
- **SparkFun** - Matériel open-source
- **Amazon** - Disponibilité large
- **AliExpress** - Options économiques
- **Mouser/DigiKey** - Composants professionnels

## Philosophie DIY Maintenue

Bien que des références de produit soient suggérées, l'esprit DIY de Forge est préservé :
- Les suggestions restent orientées vers des composants modifiables
- Priorité aux solutions open-source et hackables
- Encouragement à l'apprentissage et à la personnalisation
- Les spécifications techniques permettent de comprendre les composants

## 🔧 Dépannage

### Liens de recherche ne fonctionnent pas ?
- ✅ **Automatiquement corrigé** : La fonction `generateWorkingPurchaseUrl()` génère des liens de recherche fiables
- ✅ Les liens pointent vers les pages de recherche des vrais sites de fournisseurs
- ✅ Fallback vers Google si le fournisseur n'est pas reconnu

### Parsing JSON échoue ?
- ✅ **Automatiquement corrigé** : La fonction `cleanJsonResponse()` corrige les erreurs de format courantes
- ✅ Gestion des balises markdown `````json...`````
- ✅ Correction des valeurs non-quotées (comme `5W` → `"5W"`)

## Prochaines Améliorations

1. **Comparaison de prix** entre fournisseurs
2. **Alternatives suggérées** pour chaque composant
3. **Historique des prix** et alertes
4. **Intégration avec des APIs** de fournisseurs pour prix en temps réel
5. **Suggestions de kits** complets pour projets
6. **🆕 Cache des résultats de recherche** pour performance améliorée 