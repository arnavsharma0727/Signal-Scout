drop index if exists source_documents_content_hash_uidx;
create unique index source_documents_content_hash_uidx
  on source_documents (content_hash);
