// Importations de base
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Configuration
const ROOT_FOLDER = 'quizzhtml';
const ANNEE_SCOLAIRE = '2025-26';
const BASE_PATH = path.join(__dirname, ROOT_FOLDER, ANNEE_SCOLAIRE);

// Sert les fichiers statiques (comme le CSS)
app.use(express.static('public'));

// Permet d'accéder aux fichiers de quiz statiques
app.use('/quizzhtml', express.static('quizzhtml'));

// ... (La fonction getQuizDataFromFilesystem() reste la même) ...
function getQuizDataFromFilesystem() {
  const data = {};
  const niveaux = ['5eme', '4eme', '3eme'];

  if (!fs.existsSync(BASE_PATH)) {
    console.error(`Le chemin de base des quiz n'existe pas: ${BASE_PATH}`);
    return data;
  }

  for (const niveau of niveaux) {
    const niveauPath = path.join(BASE_PATH, niveau);
    if (!fs.existsSync(niveauPath)) continue;

    const sequences = [];
    const sequenceDirs = fs
      .readdirSync(niveauPath)
      .filter(
        (name) =>
          name.startsWith('sequence') &&
          fs.lstatSync(path.join(niveauPath, name)).isDirectory()
      )
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/), 10) || 0;
        const numB = parseInt(b.match(/\d+/), 10) || 0;
        return numA - numB;
      });

    for (const sequenceName of sequenceDirs) {
      const seqPath = path.join(niveauPath, sequenceName);
      const quizFiles = fs
        .readdirSync(seqPath)
        .filter((name) => name.endsWith('.html'));

      const quizzes = [];
      for (const quizFile of quizFiles) {
        const fileName = path.parse(quizFile).name;
        // *** On ne génère plus le titre ici, mais dans la fonction de rendu ***
        const title = `Quiz ${fileName}`;

        quizzes.push({
          id: fileName,
          title: title,
          href: `${ROOT_FOLDER}/${ANNEE_SCOLAIRE}/${niveau}/${sequenceName}/${quizFile}`,
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
// --------------------------------------------------------------------------

/**
 * Génère la carte de séquence HTML pour un niveau.
 * Chaque carte de séquence est un élément de la grille (donc une colonne).
 */
function generateSequenceGridHTML(niveau, sequences) {
  // La classe CSS 'sequences-grid' gère la disposition en colonnes (grille responsive)
  let html = '<div class="sequences-grid">';

  for (const sequence of sequences) {
    let quizListHTML = '<ul class="quizzes-list">';

    // Utilisation de l'index 'i' pour générer le "Quiz N°{index}"
    for (let i = 0; i < sequence.quizzes.length; i++) {
      const quiz = sequence.quizzes[i];
      const quizNumber = i + 1; // Le numéro du quiz dans la séquence (commence à 1)

      quizListHTML += `
                <li class="quiz-item">
                    <a href="${quiz.href}" class="quiz-link" target="_blank">
                        <span class="quiz-logo" aria-hidden="true">🧠</span>
                        Quiz N°${quizNumber}
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

// ... (Les autres fonctions generateFullAccordionHTML() et la route app.get('/') restent les mêmes) ...
function generateFullAccordionHTML(quizData) {
  let fullHTML = '';

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

app.get('/', (req, res) => {
  const quizData = getQuizDataFromFilesystem();
  const accordionHTML = generateFullAccordionHTML(quizData);

  const htmlPage = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plateforme de Quiz Scolaires - Dynamique Node.js</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/styles.css"> </head>
<body>

<header>
    <div class="container">
        <h1>Plateforme de Quiz Scolaires 🚀</h1>
        <p>Accès généré dynamiquement par Node.js : Vos liens sont toujours à jour !</p>
    </div>
</header>

<main class="container">
    <div id="quiz-container">
        ${accordionHTML || '<p>Aucun quiz trouvé. Vérifiez les dossiers.</p>'}
    </div>
</main>

<script>
    // --- Activation de l'Accordion Côté Client (JavaScript) ---
    function activateAccordion() {
        const headers = document.querySelectorAll('.accordion-header');

        headers.forEach((header, index) => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const isActive = header.classList.contains('active');
                
                // Fermer tous les autres accordions
                document.querySelectorAll('.accordion-header').forEach(h => {
                    h.classList.remove('active');
                    h.nextElementSibling.style.display = 'none';
                });

                // Ouvrir ou fermer celui cliqué
                if (!isActive) {
                    header.classList.add('active');
                    content.style.display = 'block';
                }
            });
            // Ouvrir le premier niveau par défaut
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
