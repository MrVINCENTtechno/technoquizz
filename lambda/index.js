// lambda/index.js
const express = require('express');
const serverless = require('serverless-http');
const fs = require('fs');
const path = require('path');

const app = express();

// Configuration
const ROOT_FOLDER = 'quizzhtml';
const ANNEE_SCOLAIRE = '2025-26';
// NOTE IMPORTANTE: Le chemin de base doit être ajusté pour l'environnement Netlify Lambda
// process.cwd() retourne le répertoire de base de la fonction Netlify.
// 💡 TEST #1 : Pour le débugage, essayez de remonter d'un niveau si 'quizzhtml' est à la racine
const DEPOSIT_ROOT = path.join(__dirname, '..'); 
const BASE_PATH = path.join(process.cwd(), ROOT_FOLDER, ANNEE_SCOLAIRE);


// --- Middleware pour servir les quiz statiques ---
// C'est CRUCIAL car Express est exécuté dans le dossier lambda/.
// Nous devons remonter d'un niveau (..) pour atteindre le dossier quizzhtml.
app.use(`/${ROOT_FOLDER}`, express.static(path.join(__dirname, '..', ROOT_FOLDER)));


// --- LOGIQUE DE SCAN DU SYSTÈME DE FICHIERS (Reste la même) ---
function getQuizDataFromFilesystem() {
    const data = {};
    const niveaux = ['5eme', '4eme', '3eme'];

    if (!fs.existsSync(BASE_PATH)) {
        console.error(`Le chemin de base des quiz n'existe pas: ${BASE_PATH}`);
        return data;
    }

    // ... (Le contenu de votre fonction est le même, utilisant fs et path)
    for (const niveau of niveaux) {
        const niveauPath = path.join(BASE_PATH, niveau);
        if (!fs.existsSync(niveauPath)) continue;

        const sequences = [];
        const sequenceDirs = fs.readdirSync(niveauPath)
            .filter(name => name.startsWith('sequence') && fs.lstatSync(path.join(niveauPath, name)).isDirectory())
            .sort((a, b) => { 
                const numA = parseInt(a.match(/\d+/), 10) || 0;
                const numB = parseInt(b.match(/\d+/), 10) || 0;
                return numA - numB;
            });

        for (const sequenceName of sequenceDirs) {
            const seqPath = path.join(niveauPath, sequenceName);
            const quizFiles = fs.readdirSync(seqPath).filter(name => name.endsWith('.html'));
            
            const quizzes = [];
            for (let i = 0; i < quizFiles.length; i++) {
                const quizFile = quizFiles[i];
                const fileName = path.parse(quizFile).name;
                
                quizzes.push({
                    id: fileName,
                    href: `${ROOT_FOLDER}/${ANNEE_SCOLAIRE}/${niveau}/${sequenceName}/${quizFile}`,
                    title_index: i + 1, // Pour le "Quiz N°{index}"
                });
            }

            if (quizzes.length > 0) {
                const sequenceNumber = sequenceName.replace('sequence', '');
                sequences.push({
                    sequence_name: sequenceName,
                    sequence_title: `Séquence ${sequenceNumber}`,
                    quizzes: quizzes,
                });
            }
        }
        
        data[niveau] = sequences;
    }
    return data;
}

// ... (Les fonctions generateSequenceGridHTML() et generateFullAccordionHTML() restent les mêmes, mais utilisez quiz.title_index) ...

function generateSequenceGridHTML(niveau, sequences) {
    let html = '<div class="sequences-grid">';
    
    for (const sequence of sequences) {
        let quizListHTML = '<ul class="quizzes-list">';
        
        for (const quiz of sequence.quizzes) { // Utilisation des données préparées
            quizListHTML += `
                <li class="quiz-item">
                    <a href="${quiz.href}" class="quiz-link" target="_blank">
                        <span class="quiz-logo" aria-hidden="true">🧠</span>
                        Quiz N°${quiz.title_index}
                    </a>
                </li>
            `;
        }
        quizListHTML += '</ul>';

        html += `
            <div class="sequence-card">
                <h4>${sequence.sequence_title}</h4>
                ${quizListHTML}
            </div>
        `;
    }
    html += '</div>';
    return html;
}

function generateFullAccordionHTML(quizData) {
    let fullHTML = '';
    // ... (Code pour générer l'accordion comme avant)
    for (const niveau in quizData) {
        const sequences = quizData[niveau];
        if (sequences.length === 0) continue;

        const sequencesHTML = generateSequenceGridHTML(niveau, sequences);

        fullHTML += `
            <div class="accordion-item">
                <div class="accordion-header" id="accordion-${niveau}">
                    Niveau ${niveau.toUpperCase()}
                </div>
                <div class="accordion-content">
                    ${sequencesHTML}
                </div>
            </div>
        `;
    }
    return fullHTML;
}

// --- ROUTE PRINCIPALE / (maintenant gérée par la fonction) ---
app.get('/', (req, res) => {
    const quizData = getQuizDataFromFilesystem();
    const accordionHTML = generateFullAccordionHTML(quizData);
    
    // NOTE : Assurez-vous que le CSS est servi soit par le dossier public 
    // (si vous le compilez), soit par un CDN, soit intégré. 
    // Dans cette structure, il est plus simple de le servir comme fichier statique.
    
    const htmlPage = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plateforme de Quiz Scolaires - Dynamique Netlify</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/styles.css"> 
</head>
<body>
    
<header>
    <div class="container">
        <h1>Plateforme de Quiz Scolaires 🚀</h1>
        <p>Généré dynamiquement par une Netlify Function !</p>
    </div>
</header>
    
<main class="container">
    <div id="quiz-container">
        ${accordionHTML || '<p>Aucun quiz trouvé. Vérifiez les dossiers.</p>'}
    </div>
</main>
    
<script>
    // ... (Code JavaScript pour l'accordion - identique) ...
    function activateAccordion() {
        const headers = document.querySelectorAll('.accordion-header');

        headers.forEach((header, index) => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const isActive = header.classList.contains('active');
                
                document.querySelectorAll('.accordion-header').forEach(h => {
                    h.classList.remove('active');
                    h.nextElementSibling.style.display = 'none';
                });

                if (!isActive) {
                    header.classList.add('active');
                    content.style.display = 'block';
                }
            });
            if (index === 0) {
                header.click();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', activateAccordion);
</script>

</body>
</html>
    `;
    res.send(htmlPage);
});

// CRUCIAL: Exporter le handler pour Netlify Functions
module.exports.handler = serverless(app);