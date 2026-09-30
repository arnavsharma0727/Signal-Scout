create unique index if not exists source_documents_content_hash_uidx
  on source_documents (content_hash)
  where content_hash is not null;
