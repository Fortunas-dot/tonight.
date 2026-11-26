-- Either person in a match can call off the plan ("Cancel kindly" in Plan & safety).
drop policy if exists "cancel plans in my matches" on public.plans;
create policy "cancel plans in my matches" on public.plans
  for delete to authenticated
  using (app.is_match_member(match_id));
