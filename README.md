# 🎨 PicturÆvox - Dessin Collaboratif en Temps Réel

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.6.1-blue.svg)](https://socket.io/)
[![Konva.js](https://img.shields.io/badge/Konva.js-9.2.0-orange.svg)](https://konvajs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Application de dessin collaboratif en temps réel avec trois interfaces distinctes : publique simplifiée, atelier avancé et administration complète.

## ✨ Fonctionnalités

### 🎯 **Interface Publique** (`/index`)
- **Dessin collaboratif** en temps réel
- **Outils simplifiés** : brush, texture, effets animés (sparkles, neon, fire, watercolor, electric, petals)
- **Pan essentiel** pour explorer la toile collaborative
- **Couleur fixe blanche** sur fond noir
- **Mobile-first** ultra responsive
- **Gomme et undo** intégrés

### 🎨 **Atelier Artiste** (`/atelier`)
- **Interface complète** avec sidebar
- **Formes géométriques** (cercles, rectangles, triangles, étoiles, lignes, flèches)
- **Palette de couleurs** étendue + sélecteur personnalisé
- **Zoom et pan** avancés avec indicateur
- **Pipette couleur** pour échantillonner
- **Export PNG** haute qualité
- **Tous les brush animés** avec tracés permanents

### 👑 **Interface Admin** (`/chantilly`)
- **Contrôle global** du canvas
- **Clear complet** pour tous les utilisateurs
- **Reset des effets** sélectif
- **Gomme ciblée** pour supprimer des éléments
- **Undo global** (limité à 2 actions pour performance)
- **Fond noir/blanc** commutable
- **Minimap** et interface masquable
- **Vue d'ensemble** avec zoom libre

## 🚀 Optimisations Techniques

### 📡 **Réseau & Performance**
- **Throttling intelligent** des événements (250ms pour réseau faible)
- **Envoi groupé** des effets brush pour optimiser la bande passante
- **Limite d'effets actifs** (15 max) pour éviter la surcharge
- **Tracés permanents** avec throttling (500ms)
- **Nettoyage automatique** des anciens effets
- **Historique limité** (2 actions) pour optimiser la mémoire

### 📱 **Mobile Ultra-Responsive**
- **Toolbar adaptative** sur une ligne stricte
- **Calculs dynamiques** de taille selon la largeur d'écran
- **Pan tactile** optimisé sans décalage
- **Tous les outils** visibles sur mobile (sauf écrans < 320px)
- **Gestes tactiles** fluides et précis
- **Support Safari** et environnements WebView

### 🎨 **Système de Brush Unifié**
- **BrushManager** centralisé pour cohérence
- **Effets temporaires** animés + **tracés permanents**
- **6 brush spéciaux** : sparkles, neon, watercolor, electric, fire, petals
- **Paramètres uniformes** pour tous les brush
- **Synchronisation** parfaite entre toutes les interfaces

## 🛠 Installation

### Prérequis
- **Node.js** 18.0.0 ou supérieur
- **npm** 9.0.0 ou supérieur

### Installation rapide

```bash
# Cloner le repository
git clone https://github.com/votre-username/picturae-vox.git
cd picturae-vox

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Ou en production
npm start
```

### Variables d'environnement (optionnel)

```bash
# Créer un fichier .env
PORT=3000
NODE_ENV=production
```

## 🌐 Routes et Interfaces

| Route | Interface | Description |
|-------|-----------|-------------|
| `/` | **Public** | Interface simplifiée pour tous |
| `/atelier` | **Artiste** | Outils avancés et formes |
| `/chantilly` | **Admin** | Contrôle et modération |
| `/health` | **API** | Health check du serveur |

## 🎮 Utilisation

### Interface Publique
1. **Choisir un outil** dans la toolbar en bas
2. **Dessiner** directement sur le canvas
3. **Utiliser pan** pour explorer la toile collaborative
4. **Undo** avec Ctrl+Z ou bouton dédié

### Interface Atelier
1. **Sélectionner couleurs** dans la palette latérale
2. **Créer des formes** en cliquant-glissant
3. **Zoomer/dézoomer** avec la molette
4. **Exporter** l'œuvre en PNG

### Interface Admin
1. **Surveiller** l'activité globale
2. **Nettoyer** avec Ctrl+Shift+C (dessins) ou Ctrl+Shift+E (effets)
3. **Reset complet** avec Ctrl+Shift+R
4. **Masquer l'UI** pour vue plein écran

## 🔧 Architecture Technique

### Backend
- **Express.js** - Serveur web
- **Socket.io** - WebSockets temps réel
- **Gestion mémoire** optimisée avec nettoyage automatique
- **Store en mémoire** avec limite de formes (500 max)
- **TTL automatique** pour les anciens tracés (5min)

### Frontend
- **Konva.js** - Moteur de rendu canvas 2D
- **Socket.io Client** - Communication temps réel
- **CSS Grid/Flexbox** - Responsive design
- **Vanilla JavaScript** - Performance optimale
- **BrushManager** - Système unifié d'effets

### Optimisations
- **Throttling** intelligent des événements
- **Batch sending** pour les effets réseau
- **Memory cleanup** automatique
- **Simplified drawing** pour performances mobiles
- **Compressed points** pour réduire la bande passante

## 📱 Compatibilité Mobile

### Breakpoints Responsive
- **768px+** : Interface complète (9 outils + slider)
- **480px** : Interface adaptée (9 outils compacts)
- **375px** : Version mobile standard (9 outils ultra-compacts)
- **320px** : Version minimale (7 outils essentiels)
- **280px** : Support écrans extra-étroits

### Optimisations Tactiles
- **Tailles minimales** respectées (28px+ pour tactile)
- **Gestures fluides** sans décalage
- **Feedback visuel** au touch
- **Pan précis** avec compensation automatique
- **Scroll horizontal** si débordement

## 🚀 Déploiement

### Railway (recommandé)
```bash
# Le projet est configuré pour Railway
# Port automatique via process.env.PORT
# Health check sur /health
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Variables d'environnement production
```bash
PORT=3000
NODE_ENV=production
```

## 🔍 API & Événements Socket

### Événements Client → Serveur
- `drawing` - Données de tracé en temps réel
- `draw` - Tracé final à sauvegarder
- `brushEffect` - Effets de brush animés
- `texture` - Effets de texture
- `shapeCreate` - Création de formes géométriques
- `deleteShape` - Suppression d'élément
- `clearCanvas` - Clear global (admin)
- `undo` - Annuler action (admin)

### Événements Serveur → Client
- `initShapes` - Chargement initial du canvas
- `drawing` - Réception tracé temps réel
- `brushEffect` - Réception effets brush
- `clearCanvas` - Clear reçu
- `restoreShapes` - Restauration après undo
- `adminResetBrushEffects` - Reset effets par admin

## 🤝 Contribution

1. **Fork** le projet
2. **Créer** une branche feature (`git checkout -b feature/amazing-feature`)
3. **Commit** vos changements (`git commit -m 'Add amazing feature'`)
4. **Push** vers la branche (`git push origin feature/amazing-feature`)
5. **Ouvrir** une Pull Request

### Standards de code
- **ES6+** JavaScript moderne
- **Responsive-first** pour CSS
- **Performance** prioritaire
- **Documentation** des fonctions complexes
- **Tests** des nouvelles fonctionnalités

## 📝 Roadmap

### v2.0 (À venir)
- [ ] **Système d'utilisateurs** avec pseudos
- [ ] **Salles privées** et publiques
- [ ] **Chat intégré** pour collaboration
- [ ] **Historique** étendu avec timeline
- [ ] **Export SVG** vectoriel
- [ ] **Brush personnalisés** par utilisateur

### v1.5 (Prochaine)
- [ ] **Layers/Calques** système
- [ ] **Zoom synchronisé** entre utilisateurs
- [ ] **Curseurs** des autres utilisateurs visibles
- [ ] **Performance** monitoring dashboard
- [ ] **Backup** automatique périodique

## 📄 Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- **Konva.js** pour le moteur de rendu canvas performant
- **Socket.io** pour les WebSockets temps réel fiables
- **Express.js** pour le serveur web robuste
- **Communauté open-source** pour l'inspiration et les outils

## 📞 Support

- **Issues GitHub** : [Créer un ticket](https://github.com/votre-username/picturae-vox/issues)
- **Documentation** : Voir ce README
- **Démo live** : [https://votre-app.railway.app](https://votre-app.railway.app)

---

<div align="center">

**🎨 Fait avec ❤️ pour la collaboration créative**

[⭐ Donnez une étoile](https://github.com/votre-username/picturae-vox) • [🐛 Signaler un bug](https://github.com/votre-username/picturae-vox/issues) • [💡 Demander une fonctionnalité](https://github.com/votre-username/picturae-vox/issues)

</div>