-- Stable continuation through an author's complete draft catalogue.
CREATE INDEX study_materials_owner_page_idx
  ON study_materials(owner_user_id, updated_at DESC, id DESC);
