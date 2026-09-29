window.mintMindNative=(()=>{
  const plugins=()=>window.Capacitor?.Plugins||{};
  const isNative=()=>Boolean(window.Capacitor?.isNativePlatform?.());
  const local=()=>plugins().LocalNotifications;
  const camera=()=>plugins().Camera;
  const app=()=>plugins().App;
  const setup=()=>{if(!isNative()||!app())return;app().addListener('backButton',event=>{if(event.canGoBack)window.history.back();else app().exitApp()});app().addListener('appUrlOpen',event=>{const prefix='com.mintmind.app://';if(!event.url.startsWith(prefix))return;const target=event.url.slice(prefix.length);const allowed=target.startsWith('change-password.html')||target.startsWith('login.html');location.assign(`/${allowed?target:'login.html'}`)})};
  const requestNotifications=async()=>{if(!isNative()||!local())return false;const result=await local().requestPermissions();return result.display==='granted'};
  const scheduleDebtNotifications=async items=>{if(!isNative()||!local())return false;const permitted=await local().checkPermissions();if(permitted.display!=='granted')return false;const notifications=items.filter(item=>item.due_date).map(item=>{const date=new Date(`${item.due_date}T09:00:00`);const id=Array.from(String(item.id)).reduce((total,char)=>(total*31+char.charCodeAt(0))>>>0,7)%2000000000;return{id,title:'MintMind: ครบกำหนดชำระหนี้',body:`${item.name} ครบกำหนดวันนี้`,schedule:{at:date},extra:{url:'liabilities.html'}}}).filter(item=>item.schedule.at>new Date());if(notifications.length)await local().schedule({notifications});return true};
  const takeReceiptPhoto=async()=>{if(!isNative()||!camera())return null;const result=await camera().getPhoto({quality:85,allowEditing:false,resultType:'uri',source:'camera'});if(!result.webPath)return null;const response=await fetch(result.webPath);const blob=await response.blob();return new File([blob],`receipt-${Date.now()}.jpeg`,{type:blob.type||'image/jpeg'})};
  return {isNative,setup,requestNotifications,scheduleDebtNotifications,takeReceiptPhoto};
})();
