# 💬 Guide du Chat Persistant - Style Cursor

## ✅ Fonctionnalités Implémentées

### 🎨 **Interface Style Cursor**
- Header `@/chat` minimaliste comme dans Cursor
- Design épuré et moderne
- Messages compacts avec avatars 24px
- Pas de choix de LLM ni d'options d'images

### 🛑 **Contrôle de Génération**
- **Bouton Stop** visible pendant la génération
- Arrêt immédiat de l'IA avec `onStopGeneration()`
- Feedback visuel avec message d'arrêt sauvegardé

### 💾 **Persistence des Conversations**
- **Sauvegarde automatique** de tous les messages dans PostgreSQL
- **Chargement des 10 derniers messages** au démarrage
- Format de données enrichi avec `sender`, `mode`, `suggestions`

### 🔄 **Suggestions Intégrées Style Cursor**
- Suggestions pliables/dépliables avec `ExpandMore`/`ExpandLess`
- Boutons **Accepter** ✓ et **Refuser** ✗ individuels
- Affichage du code dans des blocs monospace sombres
- Actions colorées (add=vert, modify=orange, remove=rouge)

## 📊 **Structure de Données**

### Base de Données (`Message`)
```sql
Model Message {
  id          String   @id @default(uuid)
  projectId   String   @db.Uuid
  context     String   // 'materials', 'wiring', etc.
  content     String   // Contenu du message
  sender      String   // 'user' ou 'ai'
  mode        String   // 'ask' ou 'agent'
  suggestions Json?    // Suggestions attachées (pour AI)
  createdAt   DateTime @default(now())
}
```

### Frontend (`ChatMessage`)
```typescript
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  mode: 'ask' | 'agent';
  suggestions?: MaterialSuggestion[];
}

interface MaterialSuggestion {
  id: string;
  title: string;
  description: string;
  code?: string;
  action: 'add' | 'modify' | 'remove';
  expanded: boolean;
}
```

## 🔌 **API Endpoints**

### Récupérer les Messages
```typescript
GET /api/projects/:id/messages?context=materials&limit=10
// Retourne les 10 derniers messages du contexte 'materials'
```

### Sauvegarder un Message
```typescript
POST /api/projects/:id/messages
{
  context: 'materials',
  content: 'Message contenu',
  sender: 'user' | 'ai',
  mode: 'ask' | 'agent',
  suggestions?: {...}
}
```

## 🚀 **Utilisation**

### Composant ChatPanel
```typescript
<ChatPanel
  messages={messages}
  onSendMessage={handleSendChatMessage}
  onStopGeneration={handleStopGeneration}
  onAcceptSuggestion={handleAcceptSuggestion}
  onRejectSuggestion={handleRejectSuggestion}
  isGenerating={isGenerating}
/>
```

### Fonctions Handler
```typescript
// Chargement automatique au démarrage
const loadChatMessages = async () => {
  const dbMessages = await api.projects.getChatMessages(projectId, 'materials', 10);
  setMessages(convertToCharMessages(dbMessages));
};

// Sauvegarde automatique de chaque message
const saveChatMessage = async (message: ChatMessage) => {
  await api.projects.sendChatMessage(projectId, {
    context: 'materials',
    content: message.content,
    sender: message.sender,
    mode: message.mode,
    suggestions: message.suggestions || null
  });
};
```

## 🎯 **Workflow Complet**

1. **Chargement** : Au démarrage, les 10 derniers messages sont chargés
2. **Interaction** : L'utilisateur tape un message et choisit Ask/Agent
3. **Sauvegarde User** : Le message utilisateur est immédiatement sauvegardé
4. **Génération IA** : L'IA traite la demande
5. **Sauvegarde IA** : La réponse IA (avec suggestions) est sauvegardée
6. **Actions** : L'utilisateur peut accepter/refuser des suggestions individuelles
7. **Persistance** : Toutes les actions sont sauvegardées pour retrouver l'historique

## 🔧 **Configuration Backend**

### Service API
```typescript
// Méthodes ajoutées à api.projects
getChatMessages(projectId, context, limit)
sendChatMessage(projectId, messageData)
```

### Base de Données
- Migration automatique `20250613134743_add_chat_message_fields`
- Index sur `(projectId, context)` pour performance
- Support JSONB pour les suggestions complexes

## 💡 **Avantages**

### ✅ **User Experience**
- **Continuité** : Retrouver ses conversations après un refresh
- **Historique** : Voir l'évolution des demandes et réponses
- **Contrôle** : Pouvoir arrêter la génération à tout moment

### ✅ **Technical Benefits** 
- **Scalabilité** : Pagination avec limit par défaut de 10
- **Performance** : Index optimisés pour requêtes fréquentes
- **Flexibilité** : Support de différents contextes (materials, wiring, etc.)

### ✅ **Style Cursor**
- **Minimalisme** : Interface épurée sans distractions
- **Efficacité** : Actions rapides Accept/Reject
- **Modernité** : Design contemporain et réactif

---

🎉 **Le chat ressemble maintenant exactement à Cursor avec persistence complète !** 