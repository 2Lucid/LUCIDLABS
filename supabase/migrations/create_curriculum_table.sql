-- ============================================
-- LUCID LABS - Dynamic Curriculum System
-- Migration: Table pour curriculum français auto-généré
-- ============================================

-- 1. Créer la table de curriculum
CREATE TABLE IF NOT EXISTS french_curriculum (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  -- Identification du sujet
  subject text NOT NULL,              -- Matière (Mathématiques, Histoire...)
  level text NOT NULL,                -- Niveau (6ème, Terminale...)
  topic text NOT NULL UNIQUE,         -- Sujet complet (ex: "Mathématiques - Théorème de Pythagore (4ème)")
  
  -- Métadonnées pédagogiques
  difficulty text,                    -- Facile, Moyen, Difficile, Expert
  blooms_target jsonb,                -- Distribution cible des niveaux Bloom
  key_concepts text[],                -- Concepts clés du sujet
  
  -- Statistiques d'utilisation
  times_used integer DEFAULT 0,      -- Nombre de fois utilisé pour génération
  avg_judge_score float,             -- Score moyen du Judge pour ce sujet
  success_rate float,                -- Taux de validation (%)
  
  -- Source et validation
  source text DEFAULT 'gemini',      -- 'gemini', 'manual', 'eduscol'
  is_validated boolean DEFAULT false, -- Validé par un humain ou non
  eduscol_reference text             -- Lien BO si disponible
);

-- 2. Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_curriculum_subject ON french_curriculum(subject);
CREATE INDEX IF NOT EXISTS idx_curriculum_level ON french_curriculum(level);
CREATE INDEX IF NOT EXISTS idx_curriculum_validated ON french_curriculum(is_validated);
CREATE INDEX IF NOT EXISTS idx_curriculum_times_used ON french_curriculum(times_used);

-- 3. Fonction pour sélectionner un sujet intelligent (moins utilisé = prioritaire)
CREATE OR REPLACE FUNCTION get_balanced_topic()
RETURNS TABLE (
  id uuid,
  topic text,
  subject text,
  level text
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sélectionner parmi les sujets les moins utilisés
  RETURN QUERY
  SELECT 
    fc.id,
    fc.topic,
    fc.subject,
    fc.level
  FROM french_curriculum fc
  WHERE fc.is_validated = true OR fc.source = 'gemini'
  ORDER BY fc.times_used ASC, RANDOM()
  LIMIT 1;
END;
$$;

-- 4. Fonction pour incrémenter l'usage d'un sujet
CREATE OR REPLACE FUNCTION increment_topic_usage(topic_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE french_curriculum
  SET times_used = times_used + 1
  WHERE id = topic_id;
END;
$$;

-- 5. Fonction pour mettre à jour les stats d'un sujet
CREATE OR REPLACE FUNCTION update_topic_stats(
  p_topic text,
  p_judge_score float,
  p_success boolean
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_avg float;
  current_rate float;
  current_usage int;
BEGIN
  -- Récupérer les stats actuelles
  SELECT avg_judge_score, success_rate, times_used
  INTO current_avg, current_rate, current_usage
  FROM french_curriculum
  WHERE topic = p_topic;
  
  -- Calculer les nouvelles moyennes
  UPDATE french_curriculum
  SET 
    avg_judge_score = COALESCE(
      (COALESCE(current_avg, 0) * current_usage + p_judge_score) / (current_usage + 1),
      p_judge_score
    ),
    success_rate = COALESCE(
      (COALESCE(current_rate, 0) * current_usage + CASE WHEN p_success THEN 1.0 ELSE 0.0 END) / (current_usage + 1),
      CASE WHEN p_success THEN 1.0 ELSE 0.0 END
    )
  WHERE topic = p_topic;
END;
$$;

-- 6. Seed initial (120+ sujets couvrant tout le programme français)
INSERT INTO french_curriculum (subject, level, topic, is_validated, source, difficulty) VALUES
  -- ========== MATHÉMATIQUES COLLÈGE ==========
  ('Mathématiques', 'Collège', 'Mathématiques - Les nombres décimaux (6ème)', true, 'manual', 'Facile'),
  ('Mathématiques', 'Collège', 'Mathématiques - Les fractions (6ème)', true, 'manual', 'Moyen'),
  ('Mathématiques', 'Collège', 'Mathématiques - Les nombres relatifs (5ème)', true, 'manual', 'Moyen'),
  ('Mathématiques', 'Collège', 'Mathématiques - Les pourcentages (5ème)', true, 'manual', 'Facile'),
  ('Mathématiques', 'Collège', 'Mathématiques - Le calcul littéral (5ème)', true, 'manual', 'Moyen'),
  ('Mathématiques', 'Collège', 'Mathématiques - Théorème de Pythagore (4ème)', true, 'manual', 'Moyen'),
  ('Mathématiques', 'Collège', 'Mathématiques - Théorème de Thalès (3ème)', true, 'manual', 'Difficile'),
  ('Mathématiques', 'Collège', 'Mathématiques - Fractions et Puissances (3ème)', true, 'manual', 'Moyen'),
  ('Mathématiques', 'Collège', 'Mathématiques - Équations du premier degré (4ème)', true, 'manual', 'Moyen'),
  ('Mathématiques', 'Collège', 'Mathématiques - Les fonctions linéaires (3ème)', true, 'manual', 'Difficile'),
  ('Mathématiques', 'Collège', 'Mathématiques - Statistiques et probabilités (3ème)', true, 'manual', 'Moyen'),
  
  -- ========== MATHÉMATIQUES LYCÉE ==========
  ('Mathématiques', 'Lycée', 'Mathématiques - Les fonctions (2nde)', true, 'manual', 'Moyen'),
  ('Mathématiques', 'Lycée', 'Mathématiques - Équations du second degré (2nde)', true, 'manual', 'Moyen'),
  ('Mathématiques', 'Lycée', 'Mathématiques - Vecteurs et repérage (2nde)', true, 'manual', 'Moyen'),
  ('Mathématiques', 'Lycée', 'Mathématiques - Les dérivées (1ère)', true, 'manual', 'Difficile'),
  ('Mathématiques', 'Lycée', 'Mathématiques - Les suites numériques (1ère)', true, 'manual', 'Difficile'),
  ('Mathématiques', 'Lycée', 'Mathématiques - Produit scalaire (1ère)', true, 'manual', 'Difficile'),
  ('Mathématiques', 'Lycée', 'Mathématiques - Les logarithmes (Terminale)', true, 'manual', 'Difficile'),
  ('Mathématiques', 'Lycée', 'Mathématiques - Les primitives (Terminale)', true, 'manual', 'Expert'),
  ('Mathématiques', 'Lycée', 'Mathématiques - Les nombres complexes (Terminale)', true, 'manual', 'Expert'),
  ('Mathématiques', 'Lycée', 'Mathématiques - Probabilités conditionnelles (Terminale)', true, 'manual', 'Difficile'),
  
  -- ========== FRANÇAIS COLLÈGE ==========
  ('Français', 'Collège', 'Français - Les classes grammaticales (6ème)', true, 'manual', 'Facile'),
  ('Français', 'Collège', 'Français - Les temps de l''indicatif (6ème)', true, 'manual', 'Facile'),
  ('Français', 'Collège', 'Français - Le discours direct et indirect (5ème)', true, 'manual', 'Moyen'),
  ('Français', 'Collège', 'Français - Les figures de style (4ème)', true, 'manual', 'Moyen'),
  ('Français', 'Collège', 'Français - Les propositions subordonnées (3ème)', true, 'manual', 'Difficile'),
  ('Français', 'Collège', 'Français - L''argumentation (3ème)', true, 'manual', 'Difficile'),
  ('Français', 'Collège', 'Français - Le récit (6ème)', true, 'manual', 'Facile'),
  ('Français', 'Collège', 'Français - La poésie (5ème)', true, 'manual', 'Moyen'),
  
  -- ========== FRANÇAIS / LITTÉRATURE LYCÉE ==========
  ('Littérature', 'Lycée', 'Littérature - Le Romantisme (1ère)', true, 'manual', 'Moyen'),
  ('Littérature', 'Lycée', 'Littérature - Le Réalisme (1ère)', true, 'manual', 'Moyen'),
  ('Littérature', 'Lycée', 'Littérature - Le Naturalisme (1ère)', true, 'manual', 'Moyen'),
  ('Littérature', 'Lycée', 'Littérature - Le Surréalisme (1ère)', true, 'manual', 'Difficile'),
  ('Littérature', 'Lycée', 'Littérature - Le théâtre classique (1ère)', true, 'manual', 'Moyen'),
  ('Littérature', 'Lycée', 'Littérature - La dissertation littéraire (Terminale)', true, 'manual', 'Difficile'),
  
  -- ========== HISTOIRE COLLÈGE ==========
  ('Histoire', 'Collège', 'Histoire - La Préhistoire (6ème)', true, 'manual', 'Facile'),
  ('Histoire', 'Collège', 'Histoire - L''Égypte antique (6ème)', true, 'manual', 'Facile'),
  ('Histoire', 'Collège', 'Histoire - L''Empire romain (6ème)', true, 'manual', 'Moyen'),
  ('Histoire', 'Collège', 'Histoire - Le Moyen Âge (5ème)', true, 'manual', 'Moyen'),
  ('Histoire', 'Collège', 'Histoire - La Renaissance (5ème)', true, 'manual', 'Moyen'),
  ('Histoire', 'Collège', 'Histoire - Les Grandes Découvertes (5ème)', true, 'manual', 'Moyen'),
  ('Histoire', 'Collège', 'Histoire - La Révolution française (4ème)', true, 'manual', 'Difficile'),
  ('Histoire', 'Collège', 'Histoire - Napoléon Bonaparte (4ème)', true, 'manual', 'Moyen'),
  ('Histoire', 'Collège', 'Histoire - La Révolution industrielle (4ème)', true, 'manual', 'Moyen'),
  ('Histoire', 'Collège', 'Histoire - La Première Guerre Mondiale (3ème)', true, 'manual', 'Difficile'),
  ('Histoire', 'Collège', 'Histoire - La Seconde Guerre Mondiale (3ème)', true, 'manual', 'Difficile'),
  ('Histoire', 'Collège', 'Histoire - La Shoah (3ème)', true, 'manual', 'Difficile'),
  
  -- ========== HISTOIRE LYCÉE ==========
  ('Histoire', 'Lycée', 'Histoire - La Guerre Froide (Terminale)', true, 'manual', 'Difficile'),
  ('Histoire', 'Lycée', 'Histoire - La décolonisation (Terminale)', true, 'manual', 'Difficile'),
  ('Histoire', 'Lycée', 'Histoire - La construction européenne (Terminale)', true, 'manual', 'Moyen'),
  ('Histoire', 'Lycée', 'Histoire - Les totalitarismes (Terminale)', true, 'manual', 'Difficile'),
  ('Histoire', 'Lycée', 'Histoire - La Ve République (Terminale)', true, 'manual', 'Moyen'),
  ('Histoire', 'Lycée', 'Histoire - Les mémoires de la Seconde Guerre mondiale (Terminale)', true, 'manual', 'Difficile'),
  
  -- ========== GÉOGRAPHIE COLLÈGE ==========
  ('Géographie', 'Collège', 'Géographie - Les continents et océans (6ème)', true, 'manual', 'Facile'),
  ('Géographie', 'Collège', 'Géographie - Les métropoles mondiales (6ème)', true, 'manual', 'Moyen'),
  ('Géographie', 'Collège', 'Géographie - Les inégalités mondiales (5ème)', true, 'manual', 'Moyen'),
  ('Géographie', 'Collège', 'Géographie - Les ressources naturelles (5ème)', true, 'manual', 'Moyen'),
  ('Géographie', 'Collège', 'Géographie - Les espaces de faible densité (3ème)', true, 'manual', 'Moyen'),
  ('Géographie', 'Collège', 'Géographie - L''urbanisation (3ème)', true, 'manual', 'Moyen'),
  
  -- ========== GÉOGRAPHIE LYCÉE ==========
  ('Géographie', 'Lycée', 'Géographie - La mondialisation (Terminale)', true, 'manual', 'Difficile'),
  ('Géographie', 'Lycée', 'Géographie - Les territoires dans la mondialisation (Terminale)', true, 'manual', 'Difficile'),
  ('Géographie', 'Lycée', 'Géographie - L''aménagement du territoire français (1ère)', true, 'manual', 'Moyen'),
  
  -- ========== SVT COLLÈGE ==========
  ('SVT', 'Collège', 'SVT - Le corps humain (6ème)', true, 'manual', 'Facile'),
  ('SVT', 'Collège', 'SVT - La nutrition (6ème)', true, 'manual', 'Facile'),
  ('SVT', 'Collège', 'SVT - La reproduction (5ème)', true, 'manual', 'Moyen'),
  ('SVT', 'Collège', 'SVT - La respiration (5ème)', true, 'manual', 'Facile'),
  ('SVT', 'Collège', 'SVT - La circulation sanguine (5ème)', true, 'manual', 'Moyen'),
  ('SVT', 'Collège', 'SVT - La génétique et l''ADN (3ème)', true, 'manual', 'Difficile'),
  ('SVT', 'Collège', 'SVT - L''évolution des espèces (3ème)', true, 'manual', 'Difficile'),
  ('SVT', 'Collège', 'SVT - Le système immunitaire (3ème)', true, 'manual', 'Difficile'),
  
  -- ========== SVT LYCÉE ==========
  ('SVT', 'Lycée', 'SVT - La photosynthèse (Terminale)', true, 'manual', 'Difficile'),
  ('SVT', 'Lycée', 'SVT - La mitose et la méiose (1ère)', true, 'manual', 'Difficile'),
  ('SVT', 'Lycée', 'SVT - La géologie (Terminale)', true, 'manual', 'Moyen'),
  ('SVT', 'Lycée', 'SVT - Les enzymes (Terminale)', true, 'manual', 'Difficile'),
  ('SVT', 'Lycée', 'SVT - L''écosystème (2nde)', true, 'manual', 'Moyen'),
  
  -- ========== PHYSIQUE-CHIMIE COLLÈGE ==========
  ('Physique-Chimie', 'Collège', 'Physique-Chimie - Les états de la matière (6ème)', true, 'manual', 'Facile'),
  ('Physique-Chimie', 'Collège', 'Physique-Chimie - Les mélanges (6ème)', true, 'manual', 'Facile'),
  ('Physique-Chimie', 'Collège', 'Physique-Chimie - L''électricité (5ème)', true, 'manual', 'Moyen'),
  ('Physique-Chimie', 'Collège', 'Physique-Chimie - La lumière (5ème)', true, 'manual', 'Moyen'),
  ('Physique-Chimie', 'Collège', 'Physique-Chimie - Les atomes et les ions (3ème)', true, 'manual', 'Difficile'),
  ('Physique-Chimie', 'Collège', 'Physique-Chimie - Le pH (3ème)', true, 'manual', 'Moyen'),
  ('Physique-Chimie', 'Collège', 'Physique-Chimie - L''énergie (4ème)', true, 'manual', 'Moyen'),
  
  -- ========== PHYSIQUE LYCÉE ==========
  ('Physique', 'Lycée', 'Physique - La mécanique (2nde)', true, 'manual', 'Moyen'),
  ('Physique', 'Lycée', 'Physique - Les forces (1ère)', true, 'manual', 'Difficile'),
  ('Physique', 'Lycée', 'Physique - Mécanique de Newton (Terminale)', true, 'manual', 'Expert'),
  ('Physique', 'Lycée', 'Physique - Les ondes (Terminale)', true, 'manual', 'Difficile'),
  ('Physique', 'Lycée', 'Physique - L''électromagnétisme (Terminale)', true, 'manual', 'Expert'),
  ('Physique', 'Lycée', 'Physique - La radioactivité (Terminale)', true, 'manual', 'Difficile'),
  
  -- ========== CHIMIE LYCÉE ==========
  ('Chimie', 'Lycée', 'Chimie - La mole (2nde)', true, 'manual', 'Moyen'),
  ('Chimie', 'Lycée', 'Chimie - Les réactions chimiques (1ère)', true, 'manual', 'Difficile'),
  ('Chimie', 'Lycée', 'Chimie - Réactions acido-basiques (Terminale)', true, 'manual', 'Difficile'),
  ('Chimie', 'Lycée', 'Chimie - Les équilibres chimiques (Terminale)', true, 'manual', 'Expert'),
  ('Chimie', 'Lycée', 'Chimie - Chimie organique (Terminale)', true, 'manual', 'Difficile'),
  
  -- ========== PHILOSOPHIE LYCÉE ==========
  ('Philosophie', 'Lycée', 'Philosophie - La conscience (Terminale)', true, 'manual', 'Difficile'),
  ('Philosophie', 'Lycée', 'Philosophie - L''inconscient (Terminale)', true, 'manual', 'Difficile'),
  ('Philosophie', 'Lycée', 'Philosophie - La liberté (Terminale)', true, 'manual', 'Difficile'),
  ('Philosophie', 'Lycée', 'Philosophie - Le bonheur (Terminale)', true, 'manual', 'Moyen'),
  ('Philosophie', 'Lycée', 'Philosophie - La vérité (Terminale)', true, 'manual', 'Difficile'),
  ('Philosophie', 'Lycée', 'Philosophie - La raison (Terminale)', true, 'manual', 'Difficile'),
  ('Philosophie', 'Lycée', 'Philosophie - L''art (Terminale)', true, 'manual', 'Moyen'),
  ('Philosophie', 'Lycée', 'Philosophie - Le travail (Terminale)', true, 'manual', 'Moyen'),
  ('Philosophie', 'Lycée', 'Philosophie - La technique (Terminale)', true, 'manual', 'Moyen'),
  ('Philosophie', 'Lycée', 'Philosophie - La justice (Terminale)', true, 'manual', 'Difficile'),
  ('Philosophie', 'Lycée', 'Philosophie - L''État (Terminale)', true, 'manual', 'Difficile'),
  
  -- ========== SES LYCÉE ==========
  ('SES', 'Lycée', 'SES - Le marché et la concurrence (2nde)', true, 'manual', 'Moyen'),
  ('SES', 'Lycée', 'SES - La monnaie (1ère)', true, 'manual', 'Moyen'),
  ('SES', 'Lycée', 'SES - La croissance économique (1ère)', true, 'manual', 'Difficile'),
  ('SES', 'Lycée', 'SES - Le chômage (Terminale)', true, 'manual', 'Difficile'),
  ('SES', 'Lycée', 'SES - Les inégalités (Terminale)', true, 'manual', 'Difficile'),
  ('SES', 'Lycée', 'SES - La mobilité sociale (Terminale)', true, 'manual', 'Difficile'),
  ('SES', 'Lycée', 'SES - L''entreprise et la production (1ère)', true, 'manual', 'Moyen'),
  
  -- ========== HGGSP LYCÉE ==========
  ('HGGSP', 'Lycée', 'HGGSP - Les nouvelles frontières (Terminale)', true, 'manual', 'Difficile'),
  ('HGGSP', 'Lycée', 'HGGSP - Les espaces maritimes (Terminale)', true, 'manual', 'Difficile'),
  ('HGGSP', 'Lycée', 'HGGSP - L''espace océanique (Terminale)', true, 'manual', 'Moyen'),
  ('HGGSP', 'Lycée', 'HGGSP - La conquête spatiale (Terminale)', true, 'manual', 'Moyen'),
  ('HGGSP', 'Lycée', 'HGGSP - Les puissances mondiales (Terminale)', true, 'manual', 'Difficile'),
  ('HGGSP', 'Lycée', 'HGGSP - La Chine dans la mondialisation (Terminale)', true, 'manual', 'Difficile'),
  
  -- ========== ANGLAIS COLLÈGE ==========
  ('Anglais', 'Collège', 'Anglais - Les temps de base (6ème)', true, 'manual', 'Facile'),
  ('Anglais', 'Collège', 'Anglais - Les verbes irréguliers (5ème)', true, 'manual', 'Moyen'),
  ('Anglais', 'Collège', 'Anglais - Les modaux (4ème)', true, 'manual', 'Moyen'),
  ('Anglais', 'Collège', 'Anglais - Le présent perfect (3ème)', true, 'manual', 'Difficile'),
  ('Anglais', 'Collège', 'Anglais - Le discours indirect (3ème)', true, 'manual', 'Difficile'),
  
  -- ========== ESPAGNOL COLLÈGE ==========
  ('Espagnol', 'Collège', 'Espagnol - Les temps de base (6ème)', true, 'manual', 'Facile'),
  ('Espagnol', 'Collège', 'Espagnol - Les verbes irréguliers (5ème)', true, 'manual', 'Moyen'),
  ('Espagnol', 'Collège', 'Espagnol - Le subjonctif (3ème)', true, 'manual', 'Difficile'),
  
  -- ========== HISTOIRE DES ARTS ==========
  ('Arts', 'Lycée', 'Arts - La Renaissance artistique (2nde)', true, 'manual', 'Moyen'),
  ('Arts', 'Lycée', 'Arts - L''impressionnisme (1ère)', true, 'manual', 'Moyen'),
  ('Arts', 'Lycée', 'Arts - L''art moderne (Terminale)', true, 'manual', 'Moyen')
ON CONFLICT (topic) DO NOTHING;

-- ============================================
-- INSTRUCTIONS D'EXÉCUTION
-- ============================================
-- 
-- 1. Aller sur: https://supabase.com/dashboard/project/ooqrqemqqxxufexvcpex/sql
-- 2. Copier-coller ce script complet
-- 3. Cliquer sur "Run"
-- 4. Vérifier "Success"
--
-- ============================================
