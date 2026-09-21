export function computeMainPagePlannerAccessDenied(params: {
  activeOrganizationCanUsePlanner: boolean | undefined;
  activeOrganizationPresent: boolean;
  isMounted: boolean;
  sessionLoading: boolean;
  signedIn: boolean;
}): boolean {
  return (
    params.isMounted &&
    params.signedIn &&
    !params.sessionLoading &&
    params.activeOrganizationPresent &&
    params.activeOrganizationCanUsePlanner === false
  );
}
