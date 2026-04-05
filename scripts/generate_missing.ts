import { generateContexts } from '../app/actions';
import { SUBJECTS_BY_LEVEL } from '../lib/config/pipeline.config';

const MISSING_SUBJECTS = ['Allemand (LVB)', 'Italien (LVB)', 'HGGSP', 'HLP', 'LLCER', "Sciences de l'Ingénieur"];

async function runMissing() {
    console.log("🚀 Démarrage de la génération pour les matières manquantes...\n");
    let totalGenerated = 0;

    for (const [level, subjects] of Object.entries(SUBJECTS_BY_LEVEL)) {
        for (const subject of subjects) {
            if (MISSING_SUBJECTS.includes(subject)) {
                try {
                    console.log(`⏳ Génération: ${subject} (${level})...`);
                    const res = await generateContexts({
                        subject, 
                        level, 
                        count: 30, 
                        style: 'telegraphic'
                    });
                    totalGenerated += res.contexts?.length || 0;
                    console.log(`✅ OK: ${res.contexts?.length} contextes insérés.\n`);
                } catch(e: any) {
                    console.error(`❌ Erreur sur ${subject}/${level}:`, e.message);
                }
            }
        }
    }
    
    console.log(`\n🎉 Terminé ! ${totalGenerated} nouveaux contextes exclusifs ajoutés à la base !`);
}

runMissing();
