import { registerModule } from '../registry';
import { caLienLaw } from './ca-lien-law';
import { caPrevailingWage } from './ca-prevailing-wage';
import { caTitle24 } from './ca-title24';
import { caCalosha } from './ca-calosha';

registerModule(caLienLaw);
registerModule(caPrevailingWage);
registerModule(caTitle24);
registerModule(caCalosha);
