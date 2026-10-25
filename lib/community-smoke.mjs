export async function communityDeploymentReady(origin, fetcher = fetch) {
  try {
    const paths=["/api/community?public=summary","/community","/api/account?action=me","/robots.txt","/sitemap.xml"];
    const checks=await Promise.all(paths.map(path=>fetcher(origin+path,{redirect:"manual",signal:AbortSignal.timeout(10000)})));
    if(checks.some(response=>!response.ok))return false;
    const summary=await checks[0].json();
    const account=await checks[2].json();
    const robots=await checks[3].text();
    const sitemap=await checks[4].text();
    return Number.isInteger(summary.summary?.registered)&&Number.isInteger(summary.summary?.online)
      && Object.hasOwn(account,"user") && robots.includes("Sitemap:") && sitemap.includes("<urlset");
  }catch{return false;}
}
