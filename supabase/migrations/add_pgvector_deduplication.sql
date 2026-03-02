-- ============================================
-- LUCID LABS - Quality Control System
-- Migration: Semantic Deduplication avec pgvector
-- ============================================

-- 1. Activer l'extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Ajouter la colonne embedding à la table existante
-- Note: text-embedding-004 de Gemini produit des vecteurs de 768 dimensions
ALTER TABLE lucid_labs_entries
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Créer un index IVFFlat pour la recherche rapide par similarité
-- L'index permet des requêtes de similarité ultra-rapides
CREATE INDEX IF NOT EXISTS lucid_labs_entries_embedding_idx 
ON lucid_labs_entries 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Fonction de recherche de doublons sémantiques
-- Retourne les entrées similaires au-dessus du seuil donné
CREATE OR REPLACE FUNCTION find_semantic_duplicates(
  query_embedding vector(768),
  similarity_threshold float DEFAULT 0.95
)
RETURNS TABLE (
  id uuid, 
  subject text, 
  similarity float
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    le.id,
    le.subject,
    (1 - (le.embedding <=> query_embedding))::float as similarity
  FROM lucid_labs_entries le
  WHERE le.embedding IS NOT NULL
    AND (1 - (le.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT 5;
END;
$$;

-- ============================================
-- INSTRUCTIONS D'EXÉCUTION
-- ============================================
-- 
-- 1. Aller sur: https://supabase.com/dashboard/project/ooqrqemqqxxufexvcpex/sql
-- 2. Copier-coller ce script complet
-- 3. Cliquer sur "Run" (en bas à droite)
-- 4. Vérifier le message "Success. No rows returned"
--
-- ============================================
