import {installContentPackManagerSurface} from './content-pack-manager.js';
import {renderAccessibilityInspection} from './accessibility-inspector-ui.js';
import {renderTask as renderBaseTask} from './renderers-base.js';

installContentPackManagerSurface();

export function renderTask(task,host){
  const getAnswer=renderBaseTask(task,host);
  renderAccessibilityInspection(task);
  return getAnswer;
}
