-- SPEC 14: rls_auto_enable() es la función del event trigger `ensure_rls`; no debe ser invocable por RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
