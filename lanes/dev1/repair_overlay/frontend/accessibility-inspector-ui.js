const INSPECTION_SCHEMA='ACCESSIBILITY_INSPECTION_v1';
const PANEL_ID='accessibility-inspector';

function text(value){return typeof value==='string'?value.trim():''}
function safeFinding(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  return {
    severity:text(value.severity).toUpperCase()||'FINDING',
    code:text(value.code)||'A11Y_FINDING',
    path:text(value.path),
    message:text(value.message)||'Accessibility finding reported without a message.',
    remediation:text(value.remediation),
  };
}
function ensurePanel(){
  const anchor=document.getElementById('nonvisual-equivalent');
  if(!anchor)return null;
  let panel=document.getElementById(PANEL_ID);
  if(!panel){
    panel=document.createElement('details');
    panel.id=PANEL_ID;
    panel.className='surface subtle';
    const summary=document.createElement('summary');
    summary.id='accessibility-inspector-summary';
    summary.textContent='Accessibility Inspector — звіт недоступний';
    const status=document.createElement('p');
    status.id='accessibility-inspector-status';
    status.className='notice warning';
    const findingsHeading=document.createElement('h3');
    findingsHeading.textContent='Знахідки';
    const findings=document.createElement('ul');
    findings.id='accessibility-inspector-findings';
    findings.setAttribute('aria-label','Знахідки Accessibility Inspector');
    const linearHeading=document.createElement('h3');
    linearHeading.textContent='Лінійний звіт';
    const linear=document.createElement('ul');
    linear.id='accessibility-inspector-linear';
    linear.setAttribute('aria-label','Лінійний звіт Accessibility Inspector');
    panel.append(summary,status,findingsHeading,findings,linearHeading,linear);
    anchor.insertAdjacentElement('afterend',panel);
  }
  return {
    panel,
    summary:panel.querySelector('#accessibility-inspector-summary'),
    status:panel.querySelector('#accessibility-inspector-status'),
    findings:panel.querySelector('#accessibility-inspector-findings'),
    linear:panel.querySelector('#accessibility-inspector-linear'),
  };
}
function appendLine(host,value){
  const li=document.createElement('li');
  li.textContent=value;
  host.append(li);
}

export function renderAccessibilityInspection(task){
  const ui=ensurePanel();
  if(!ui)return;
  ui.findings.replaceChildren();
  ui.linear.replaceChildren();
  const accessibility=task&&typeof task==='object'&&task.accessibility&&typeof task.accessibility==='object'?task.accessibility:{};
  const report=accessibility.inspection;
  const valid=Boolean(report&&typeof report==='object'&&!Array.isArray(report)&&report.schema===INSPECTION_SCHEMA&&typeof report.passed==='boolean'&&Array.isArray(report.findings));
  if(!valid){
    ui.summary.textContent='Accessibility Inspector — звіт недоступний';
    ui.status.className='notice warning';
    ui.status.textContent='Accessibility Inspector: звіт недоступний; PASS не припускається.';
    appendLine(ui.findings,'Machine-readable accessibility report is unavailable for this task surface.');
    appendLine(ui.linear,'Лінійний звіт інспектора недоступний.');
    ui.panel.open=true;
    return;
  }
  const findings=report.findings.map(safeFinding).filter(Boolean);
  const status=report.passed===true?'PASS':'FAIL';
  ui.summary.textContent=`Accessibility Inspector — ${status}`;
  ui.status.className=`notice ${report.passed===true?'success':'error'}`;
  ui.status.textContent=`Accessibility Inspector: ${status}. Знахідок: ${findings.length}.`;
  findings.forEach(item=>{
    const at=item.path?` — ${item.path}`:'';
    const remediation=item.remediation?` Ремедіація: ${item.remediation}`:'';
    appendLine(ui.findings,`${item.severity} ${item.code}${at}: ${item.message}${remediation}`);
  });
  if(!findings.length)appendLine(ui.findings,'Блокуючих accessibility-знахідок немає.');
  const linear=Array.isArray(accessibility.inspection_linear)?accessibility.inspection_linear.map(text).filter(Boolean):[];
  if(linear.length)linear.forEach(line=>appendLine(ui.linear,line));
  else appendLine(ui.linear,'Лінійний звіт інспектора недоступний.');
  ui.panel.open=report.passed!==true;
}
