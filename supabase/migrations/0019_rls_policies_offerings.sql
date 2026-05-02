-- =============================================================
-- Migration: 0019_rls_policies_offerings
-- Objetivo: RLS policies para offering, servicerequest, offeringcontact
-- Contexto: Loop 03 — marketplace de serviços
-- =============================================================

-- ============================================================
-- offering
-- ============================================================

-- SELECT: all authenticated users can read offerings
DROP POLICY IF EXISTS "Offerings are readable by authenticated users" ON public.offering;
CREATE POLICY "Offerings are readable by authenticated users"
  ON public.offering
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: only owner
DROP POLICY IF EXISTS "Offering owner can insert" ON public.offering;
CREATE POLICY "Offering owner can insert"
  ON public.offering
  FOR INSERT
  WITH CHECK ("userId" = public.get_legacy_id());

-- UPDATE: only owner
DROP POLICY IF EXISTS "Offering owner can update" ON public.offering;
CREATE POLICY "Offering owner can update"
  ON public.offering
  FOR UPDATE
  USING ("userId" = public.get_legacy_id())
  WITH CHECK ("userId" = public.get_legacy_id());

-- DELETE: only owner
DROP POLICY IF EXISTS "Offering owner can delete" ON public.offering;
CREATE POLICY "Offering owner can delete"
  ON public.offering
  FOR DELETE
  USING ("userId" = public.get_legacy_id());

-- ============================================================
-- servicerequest
-- ============================================================

-- SELECT: requester (idoso/cuidador via elderlyProfile) or provider (owner of offering)
DROP POLICY IF EXISTS "ServiceRequest involved parties can read" ON public.servicerequest;
CREATE POLICY "ServiceRequest involved parties can read"
  ON public.servicerequest
  FOR SELECT
  USING (
    public.has_access_to_elderly_profile("elderlyProfileId")
    OR EXISTS (
      SELECT 1 FROM public.offering o
      WHERE o.id = "offeringId"
        AND o."userId" = public.get_legacy_id()
    )
  );

-- INSERT: only requester (idoso/cuidador)
DROP POLICY IF EXISTS "ServiceRequest requester can insert" ON public.servicerequest;
CREATE POLICY "ServiceRequest requester can insert"
  ON public.servicerequest
  FOR INSERT
  WITH CHECK (public.has_access_to_elderly_profile("elderlyProfileId"));

-- UPDATE: involved parties (requester or provider)
DROP POLICY IF EXISTS "ServiceRequest involved parties can update" ON public.servicerequest;
CREATE POLICY "ServiceRequest involved parties can update"
  ON public.servicerequest
  FOR UPDATE
  USING (
    public.has_access_to_elderly_profile("elderlyProfileId")
    OR EXISTS (
      SELECT 1 FROM public.offering o
      WHERE o.id = "offeringId"
        AND o."userId" = public.get_legacy_id()
    )
  )
  WITH CHECK (
    public.has_access_to_elderly_profile("elderlyProfileId")
    OR EXISTS (
      SELECT 1 FROM public.offering o
      WHERE o.id = "offeringId"
        AND o."userId" = public.get_legacy_id()
    )
  );

-- DELETE: implicitly blocked

-- ============================================================
-- offeringcontact
-- ============================================================

-- SELECT: all authenticated users can read offering contacts
DROP POLICY IF EXISTS "OfferingContact readable by authenticated users" ON public.offeringcontact;
CREATE POLICY "OfferingContact readable by authenticated users"
  ON public.offeringcontact
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: owner of the parent offering
DROP POLICY IF EXISTS "Offering owner can insert offeringcontact" ON public.offeringcontact;
CREATE POLICY "Offering owner can insert offeringcontact"
  ON public.offeringcontact
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.offering o
      WHERE o.id = "offeringId"
        AND o."userId" = public.get_legacy_id()
    )
  );

-- UPDATE: owner of the parent offering
DROP POLICY IF EXISTS "Offering owner can update offeringcontact" ON public.offeringcontact;
CREATE POLICY "Offering owner can update offeringcontact"
  ON public.offeringcontact
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.offering o
      WHERE o.id = "offeringId"
        AND o."userId" = public.get_legacy_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.offering o
      WHERE o.id = "offeringId"
        AND o."userId" = public.get_legacy_id()
    )
  );

-- DELETE: owner of the parent offering
DROP POLICY IF EXISTS "Offering owner can delete offeringcontact" ON public.offeringcontact;
CREATE POLICY "Offering owner can delete offeringcontact"
  ON public.offeringcontact
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.offering o
      WHERE o.id = "offeringId"
        AND o."userId" = public.get_legacy_id()
    )
  );
