export class RuntimeNextGate{
  constructor({invoke,setBusy,onData,onComplete,onError}={}){
    if(typeof invoke!=='function')throw new TypeError('invoke required');
    this.invoke=invoke;
    this.setBusy=typeof setBusy==='function'?setBusy:()=>{};
    this.onData=typeof onData==='function'?onData:()=>{};
    this.onComplete=typeof onComplete==='function'?onComplete:()=>{};
    this.onError=typeof onError==='function'?onError:()=>{};
    this.inFlight=false;
  }
  async run(nodeId){
    if(this.inFlight||!nodeId)return false;
    this.inFlight=true;
    this.setBusy(true);
    try{
      const data=await this.invoke('player.next',{node_id:nodeId});
      if(data?.complete_or_queued||!data?.task)this.onComplete(data||{});
      else this.onData(data);
      return true;
    }catch(error){
      this.onError(error);
      return false;
    }finally{
      this.inFlight=false;
      this.setBusy(false);
    }
  }
}
