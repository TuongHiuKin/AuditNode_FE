-- Run once as the AuditNode database owner with psql.
-- This script intentionally prompts for the password instead of storing it.

CREATE ROLE auditnode_chat_reader
  WITH LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION;

\password auditnode_chat_reader

ALTER ROLE auditnode_chat_reader SET default_transaction_read_only = on;
ALTER ROLE auditnode_chat_reader SET statement_timeout = '5s';
ALTER ROLE auditnode_chat_reader SET idle_in_transaction_session_timeout = '6s';

GRANT CONNECT ON DATABASE "AuditNode.db" TO auditnode_chat_reader;
GRANT USAGE ON SCHEMA public TO auditnode_chat_reader;

GRANT SELECT ON TABLE
  public.labels,
  public.server_labels,
  public.application_labels,
  public.servers,
  public.applications,
  public.port_mappings,
  public.app_dependencies,
  public.boundary_frames,
  public.datacenters
TO auditnode_chat_reader;
