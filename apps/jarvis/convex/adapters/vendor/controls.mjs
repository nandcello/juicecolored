export const PROPS = ['power','bright','ct','rgb','hue','sat','color_mode','flowing','delayoff','name'];
const number=(value,min,max,label)=>{if(!Number.isInteger(value)||value<min||value>max)throw new Error(`${label} must be ${min}–${max}.`);return value;};
export function makeCommand(action,data={}) {
  const duration=()=>number(data.duration??500,30,60000,'Transition');
  const brightness=()=>number(data.brightness,1,100,'Brightness');
  const color=()=>{if(!/^#[\da-f]{6}$/i.test(data.color || ''))throw new Error('Choose a valid color.');return parseInt(data.color.slice(1),16);};
  switch(action) {
    case 'power': if(typeof data.on!=='boolean')throw new Error('Power must be on or off.');return ['set_power',[data.on?'on':'off','smooth',duration()]];
    case 'brightness':return ['set_bright',[brightness(),'smooth',duration()]];
    case 'temperature':return ['set_ct_abx',[number(data.kelvin,1700,6500,'Temperature'),'smooth',duration()]];
    case 'color':return ['set_rgb',[color(),'smooth',duration()]];
    case 'hsv':return ['set_hsv',[number(data.hue,0,359,'Hue'),number(data.saturation,0,100,'Saturation'),'smooth',duration()]];
    case 'scene': if(data.mode==='white')return ['set_scene',['ct',number(data.kelvin,1700,6500,'Temperature'),brightness()]];if(data.mode==='color')return ['set_scene',['color',color(),brightness()]];throw new Error('Choose white or color.');
    case 'timer':return ['cron_add',[0,number(data.minutes,1,1440,'Minutes')]];
    case 'cancelTimer':return ['cron_del',[0]];
    case 'timerStatus':return ['cron_get',[0]];
    case 'default':return ['set_default',[]];
    case 'stopFlow':return ['stop_cf',[]];
    case 'rename':if(typeof data.name!=='string'||!data.name.trim()||new TextEncoder().encode(data.name).length>64)throw new Error('Use a name of 1–64 bytes.');return ['set_name',[data.name.trim()]];
    case 'flow': {
      if(!Array.isArray(data.steps)||!data.steps.length||data.steps.length>9)throw new Error('Use 1–9 flow steps.');
      const expression=data.steps.flatMap(s=>[number(s.duration,50,3600000,'Step duration'),s.mode==='white'?2:1,s.mode==='white'?number(s.kelvin,1700,6500,'Temperature'):(()=>{if(!/^#[\da-f]{6}$/i.test(s.color||''))throw new Error('Invalid step color.');return parseInt(s.color.slice(1),16);})(),number(s.brightness,1,100,'Step brightness')]).join(',');
      return ['start_cf',[number(data.count??0,0,1000,'Repeat steps'),number(data.end??0,0,2,'End behavior'),expression]];
    }
    default:throw new Error('Unknown control.');
  }
}
