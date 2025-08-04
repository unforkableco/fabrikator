# Tests et Scénarios de Validation - Phase 1 MVP

## 🧪 Scénarios de Test Manuel

### **Scénario 1: Création et chargement de scène**
**Objectif:** Valider la création automatique d'une scène et son chargement

**Étapes:**
1. Ouvrir un projet existant
2. Naviguer vers l'onglet "Design" 
3. Cliquer sur "3D Editor"
4. **Résultat attendu:** 
   - Une scène vide est créée automatiquement
   - Le viewport 3D s'affiche avec une grille
   - Le SceneGraph montre "Scene is empty"
   - Les statistiques affichent "0 objects"

---

### **Scénario 2: Upload et ajout de composant STL**
**Objectif:** Tester l'upload d'un fichier STL et son ajout à la scène

**Étapes:**
1. Dans l'onglet "Library", cliquer sur le FAB "+"
2. Remplir le formulaire:
   - Nom: "Arduino Uno"
   - Type: "Electronic"
   - Catégorie: "microcontroller"
3. Uploader un fichier STL (<50MB)
4. Cliquer "Create"
5. Cliquer "Add to Scene" sur le composant créé
6. **Résultat attendu:**
   - Le composant apparaît dans la ComponentLibrary
   - L'objet 3D s'affiche dans le viewport
   - Il apparaît dans le SceneGraph
   - Les statistiques montrent "1 object"

---

### **Scénario 3: Sélection et manipulation d'objets**
**Objectif:** Valider la sélection et les transformations de base

**Étapes:**
1. Cliquer sur un objet dans le viewport 3D
2. **Résultat:** L'objet devient jaune (sélectionné)
3. Faire glisser l'objet dans le viewport
4. **Résultat:** L'objet se déplace
5. Cliquer sur l'objet dans le SceneGraph
6. **Résultat:** L'objet reste sélectionné
7. Ctrl+Clic sur un autre objet
8. **Résultat:** Multi-sélection active

---

### **Scénario 4: Gestion hiérarchique**
**Objectif:** Tester l'arbre de scène et les opérations sur les nœuds

**Étapes:**
1. Ajouter plusieurs composants à la scène
2. Dans le SceneGraph, faire clic-droit sur un nœud
3. Sélectionner "Rename" et changer le nom
4. **Résultat:** Le nom change dans l'arbre et le viewport
5. Sélectionner "Delete"
6. **Résultat:** L'objet disparaît de partout
7. Cliquer sur l'icône de visibilité
8. **Résultat:** L'objet devient invisible dans le viewport

---

### **Scénario 5: Persistance des données**
**Objectif:** Valider la sauvegarde automatique des modifications

**Étapes:**
1. Créer une scène avec plusieurs objets
2. Modifier leurs positions
3. Renommer des objets
4. Rafraîchir la page
5. **Résultat attendu:**
   - La scène se recharge avec tous les objets
   - Les positions sont conservées
   - Les noms modifiés sont préservés

---

### **Scénario 6: Chat 3D de base**
**Objectif:** Tester l'intégration du chat contextualisé

**Étapes:**
1. Passer à l'onglet "AI Assistant"
2. Écrire: "Quels composants sont dans ma scène ?"
3. **Résultat attendu:**
   - L'IA répond avec la liste des composants actuels
   - Le contexte de la scène est envoyé
4. Sélectionner un objet dans l'éditeur 3D
5. Revenir au chat et demander: "Modifie l'objet sélectionné"
6. **Résultat:** L'IA reconnaît l'objet sélectionné

---

## 🔧 Tests Techniques

### **Test API Backend**
```bash
# Test création de scène
curl -X POST http://localhost:3001/api/scenes \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "uuid-du-projet",
    "name": "Test Scene",
    "createdBy": "test-user"
  }'

# Test récupération de scène
curl http://localhost:3001/api/scenes/project/uuid-du-projet

# Test upload STL
curl -X POST http://localhost:3001/api/components3d \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Component",
    "type": "FUNCTIONAL",
    "category": "test"
  }'

# Test upload fichier
curl -X POST http://localhost:3001/api/components3d/uuid-component/upload \
  -F "stl=@test-cube.stl"
```

### **Validation des Données**
```javascript
// Valider structure SceneGraph
const isValidSceneGraph = (sceneGraph) => {
  return (
    sceneGraph?.root &&
    sceneGraph.root.id &&
    sceneGraph.root.name &&
    Array.isArray(sceneGraph.root.children) &&
    sceneGraph.root.transform &&
    Array.isArray(sceneGraph.root.transform.position) &&
    sceneGraph.root.transform.position.length === 3
  );
};

// Valider component 3D
const isValidComponent3D = (component) => {
  const validTypes = ['DESIGN', 'FUNCTIONAL', 'ELECTRONIC', 'MECHANICAL'];
  return (
    component.id &&
    component.name &&
    validTypes.includes(component.type) &&
    component.category &&
    typeof component.isGenerated === 'boolean'
  );
};
```

---

## 🐛 Tests d'Edge Cases

### **Limites de fichiers**
1. **Upload STL > 50MB:** Doit être rejeté avec message d'erreur
2. **Fichier non-STL:** Doit être rejeté
3. **STL corrompu:** Doit être détecté et rejeté

### **Concurrence**
1. **Modifications simultanées:** Deux utilisateurs modifient la même scène
2. **Réseau lent:** Upload de gros fichier avec connexion instable

### **Performance**
1. **Scène avec 100+ objets:** Le viewport doit rester fluide
2. **Fichier STL complexe:** Rendu sans blocage de l'interface

---

## ✅ Critères de Validation Phase 1

**MVP fonctionnel si:**
- ✅ Scène 3D vide se crée automatiquement
- ✅ Upload STL fonctionne avec validation
- ✅ Objets apparaissent dans viewport avec rendu correct
- ✅ Sélection/déplacement fonctionnel
- ✅ SceneGraph reflète l'état de la scène
- ✅ Modifications sont persistées en base
- ✅ Chat 3D reçoit le contexte de la scène
- ✅ Pas de crash ou d'erreur bloquante

**Performance acceptable:**
- ⏱️ Chargement scène < 3 secondes
- ⚡ Manipulation objets fluide (>30fps)
- 💾 Sauvegarde modifications < 1 seconde
- 📤 Upload STL 1MB < 5 secondes

---

## 🔄 Tests d'Intégration

### **Intégration avec système existant**
1. **Projet → Design Panel:** Navigation fluide
2. **Materials → 3D Scene:** Composants matériaux visibles en 3D  
3. **Wiring → 3D Scene:** Composants électroniques placés automatiquement
4. **Chat général → Chat 3D:** Continuité conversationnelle

### **Compatibilité navigateurs**
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ❌ Internet Explorer (non supporté)

Cette suite de tests garantit que le MVP Phase 1 fonctionne correctement et est prêt pour les phases suivantes.