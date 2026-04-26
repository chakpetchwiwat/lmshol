-- Enable Row Level Security
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PointsLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RedeemRequest" ENABLE ROW LEVEL SECURITY;

-- 1. Policies for "User" table
-- Users can only see their own profile, Admins can see all
CREATE POLICY user_isolation_policy ON "User"
FOR ALL
USING (
  id::text = current_setting('app.current_user_id', true)
  OR current_setting('app.current_user_role', true) = 'admin'
);

-- 2. Policies for "PointsLedger" table
-- Users can only see their own ledger, Admins can see all
CREATE POLICY ledger_isolation_policy ON "PointsLedger"
FOR SELECT
USING (
  "userId"::text = current_setting('app.current_user_id', true)
  OR current_setting('app.current_user_role', true) = 'admin'
);

-- Users can only create their own ledger entries (though usually done via services)
CREATE POLICY ledger_insert_policy ON "PointsLedger"
FOR INSERT
WITH CHECK (
  "userId"::text = current_setting('app.current_user_id', true)
  OR current_setting('app.current_user_role', true) = 'admin'
);

-- 3. Policies for "RedeemRequest" table
-- Users can only see their own requests, Admins can see all
CREATE POLICY redeem_isolation_policy ON "RedeemRequest"
FOR ALL
USING (
  "userId"::text = current_setting('app.current_user_id', true)
  OR current_setting('app.current_user_role', true) = 'admin'
);
