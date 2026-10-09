"use client";
import { useEffect, useState } from "react";
const TYPES = [["collaboration","Colaboración"],["service","Prestación de servicios"],["administration","Administración"],["employment","Laboral"],["supplier","Proveedor"],["revenue_share","Participación económica"],["other","Otro"]];
const ROLES = [["issuer","Factura / emite"],["collector","Cobra"],["operator","Opera"],["supplier","Provee"],["sales","Vende"],["partner","Socio"],["investor","Inversionista"],["beneficiary","Beneficiario"],["other","Otro"]];
const USER_ROLES = [["finance","FIN · prepara"],["business_owner","Titular / representante"],["accountant","Contabilidad"],["auditor","Auditoría"],["collaborator","Colaborador / proveedor"]];
const ENTRY_PATHS = [["organization","Desde su organización"],["fin_desk","Desde su Mesa FIN"],["audit","Desde revisión / auditoría"],["external","Desde colaboración externa"]];
const labelFor = (values,x) => values.find(item=>item[0]===x)?.[1] || x || "Sin definir";
const fmtMoney=(n,c="CLP")=>n===null||n===undefined?"No definida":new Intl.NumberFormat("es-CL",{style:"currency",currency:c,maximumFractionDigits:0}).format(Number(n));
const safeUrl = x => /^https:\/\/[^\s]+$/i.test(x||"") ? x : null;
function Details({title,kicker,children,defaultOpen=false}) {
 return <details className="fanaOrgFold" open={defaultOpen || undefined}><summary><span><small>{kicker}</small><strong>{title}</strong></span><span className="fanaFoldGlyph">⌄</span></summary><div className="fanaOrgFoldBody">{children}</div></details>;
}
export default function FinOrganizationPanel({client,business,role,onAccessUpdated}) {
 const director=role==="director";
 const editable=director;
 const viewTerms=["director","finance","business_owner","accountant","auditor"].includes(role);
 const [contracts,setContracts]=useState([]);
 const [participations,setParticipations]=useState([]);
 const [members,setMembers]=useState([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [contract,setContract]=useState({title:"",contract_type:"collaboration",parties_description:"",terms_summary:"",document_url:"",status:"draft"});
 const [party,setParty]=useState({party_name:"",party_role:"operator",relationship:"to_verify",fee_model:"unverified",share_percent:"",fixed_amount:"",contract_id:"",note:""});
 const [access,setAccess]=useState({email:"",role:"finance",entry_path:"fin_desk"});
 useEffect(()=>{
   if(!client||!business?.id) return;
   let active=true;
   (async()=>{
     setError("");setBusy(true);
     try {
       const calls=[client.from("fin_org_access").select("id,role,entry_path,active,contract_id,user_id").eq("business_id",business.id)];
       if(viewTerms){
         calls.push(client.from("fin_org_contracts").select("*").eq("business_id",business.id).order("updated_at",{ascending:false}));
         calls.push(client.from("fin_org_participations").select("*").eq("business_id",business.id).order("updated_at",{ascending:false}));
       }
       const results=await Promise.all(calls);
       const failure=results.find(r=>r.error);
       if(failure) throw failure.error;
       if(!active)return;
       setMembers(results[0].data||[]);
       setContracts(viewTerms?results[1].data||[]:[]);
       setParticipations(viewTerms?results[2].data||[]:[]);
     } catch(e){if(active)setError(e.message||String(e));}
     finally{if(active)setBusy(false);}
   })();
   return ()=>{active=false;};
 },[client,business?.id,viewTerms]);
 const reload=async()=>{
   const [a,b,c]=await Promise.all([
     client.from("fin_org_contracts").select("*").eq("business_id",business.id).order("updated_at",{ascending:false}),
     client.from("fin_org_participations").select("*").eq("business_id",business.id).order("updated_at",{ascending:false}),
     client.from("fin_org_access").select("id,role,entry_path,active,contract_id,user_id").eq("business_id",business.id)
   ]);
   if(a.error||b.error||c.error)throw a.error||b.error||c.error;
   setContracts(a.data||[]);setParticipations(b.data||[]);setMembers(c.data||[]);
 };
 const saveContract=async(e)=>{
   e.preventDefault();setBusy(true);setError("");setMessage("");
   try {
     const payload={business_id:business.id,title:contract.title.trim(),contract_type:contract.contract_type,
       parties_description:contract.parties_description||null,terms_summary:contract.terms_summary||null,
       document_url:safeUrl(contract.document_url),status:"draft"};
     if(!payload.title)throw Error("Escribe un nombre para identificar el acuerdo.");
     if(contract.document_url&&!payload.document_url)throw Error("El respaldo debe ser un enlace HTTPS válido.");
     const r=await client.from("fin_org_contracts").insert(payload);
     if(r.error)throw r.error;
     setContract({title:"",contract_type:"collaboration",parties_description:"",terms_summary:"",document_url:"",status:"draft"});
     await reload();setMessage("Acuerdo registrado en borrador. No se considera firmado ni validado.");
   }catch(err){setError(err.message||String(err));}finally{setBusy(false);}
 };
 const saveParty=async(e)=>{
   e.preventDefault();setBusy(true);setError("");setMessage("");
   try {
     if(!party.party_name.trim())throw Error("Indica el nombre de la parte.");
     const share=party.share_percent===""?null:Number(party.share_percent);
     const amount=party.fixed_amount===""?null:Number(party.fixed_amount);
     if((share!==null&&(!Number.isFinite(share)||share<0||share>100))||(amount!==null&&(!Number.isFinite(amount)||amount<0)))throw Error("Los montos y porcentajes deben ser válidos.");
     const r=await client.from("fin_org_participations").insert({
       business_id:business.id,contract_id:party.contract_id||null,party_name:party.party_name.trim(),
       party_role:party.party_role,relationship:party.relationship,fee_model:party.fee_model,
       share_percent:share,fixed_amount:amount,note:party.note||null,verification_status:"pending"
     });
     if(r.error)throw r.error;
     setParty({party_name:"",party_role:"operator",relationship:"to_verify",fee_model:"unverified",share_percent:"",fixed_amount:"",contract_id:"",note:""});
     await reload();setMessage("Participación registrada como pendiente de verificación.");
   }catch(err){setError(err.message||String(err));}finally{setBusy(false);}
 };
 const assignAccess=async(e)=>{
   e.preventDefault();setBusy(true);setError("");setMessage("");
   try {
     const r=await client.rpc("fin_org_assign_user",{
       p_business_id:business.id,p_email:access.email.trim(),
       p_role:access.role,p_entry_path:access.entry_path
     });
     if(r.error)throw r.error;
     if(!r.data?.ok) throw Error(r.data?.message||"No se pudo activar el acceso.");
     setAccess(v=>({...v,email:""}));
     await reload();onAccessUpdated?.();setMessage("Acceso habilitado únicamente para esta organización.");
   }catch(err){setError(err.message||String(err));}finally{setBusy(false);}
 };
 return <section className="fanaOrgPage">
   <div className="fanaOrgIntro">
     <div><span className="fanaEyebrow">ESTRUCTURA ECONÓMICA / ORGANIZACIÓN</span><h2>{business?.name||"Organización"}</h2>
       <p>Quién vende, factura, cobra, opera y recibe; qué acuerdo respalda esa relación y quién tiene permiso de consultar FIN.</p>
     </div>
   </div>
   {error&&<div className="fanaError" role="alert">{error}<button onClick={()=>setError("")}>×</button></div>}
   {message&&<div className="fanaNotice" role="status">{message}<button onClick={()=>setMessage("")}>×</button></div>}
   <div className="fanaOrgStats">
    <div><span>Contratos registrados</span><strong>{viewTerms?contracts.length:"Restringido"}</strong></div>
    <div><span>Participaciones documentadas</span><strong>{viewTerms?participations.length:"Restringido"}</strong></div>
    <div><span>Accesos en la organización</span><strong>{director?members.length:"Según tu rol"}</strong></div>
   </div>
   {viewTerms?<>
    <Details kicker="01 · CONTRATOS" title="Acuerdos por organización" defaultOpen>
      {contracts.length?contracts.map(c=><div key={c.id} className="fanaOrgRecord"><div><strong>{c.title}</strong><span>{labelFor(TYPES,c.contract_type)} · {c.status==="verified"?"Validado":c.status==="draft"?"Borrador":c.status}</span><p>{c.parties_description||"Partes todavía sin identificar"}{c.terms_summary?" · "+c.terms_summary:""}</p></div>{safeUrl(c.document_url)&&<a target="_blank" rel="noopener noreferrer" href={c.document_url}>Documento ↗</a>}</div>):<p className="fanaHint">No existen contratos documentados. No se inventaron contratos a partir de datos operativos.</p>}
      {editable&&<details className="fanaOrgNested"><summary>+ Registrar acuerdo</summary><form className="fanaOrgForm" onSubmit={saveContract}>
        <label>Nombre del acuerdo<input required value={contract.title} onChange={e=>setContract(v=>({...v,title:e.target.value}))}/></label>
        <label>Tipo de contrato<select value={contract.contract_type} onChange={e=>setContract(v=>({...v,contract_type:e.target.value}))}>{TYPES.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
        <label>Partes participantes<input value={contract.parties_description} onChange={e=>setContract(v=>({...v,parties_description:e.target.value}))} placeholder="Partes identificadas en el acuerdo"/></label>
        <label>Condiciones económicas documentadas<textarea rows={3} value={contract.terms_summary} onChange={e=>setContract(v=>({...v,terms_summary:e.target.value}))} placeholder="No inventar porcentajes ni honorarios"/></label>
        <label>Enlace al respaldo (HTTPS)<input type="url" value={contract.document_url} onChange={e=>setContract(v=>({...v,document_url:e.target.value}))} placeholder="https://…"/></label>
        <button disabled={busy} className="fanaPrimary">Guardar borrador</button>
      </form></details>}
    </Details>
    <Details kicker="02 · PARTICIPACIÓN" title="Quién hace qué y cómo participa" defaultOpen>
      {participations.length?participations.map(p=><div className="fanaOrgRecord" key={p.id}><div><strong>{p.party_name}</strong><span>{labelFor(ROLES,p.party_role)} · {p.relationship}</span><p>{p.fee_model==="unverified"?"Condición económica pendiente de validar":p.fee_model}{p.share_percent!==null?" · "+p.share_percent+"%":""}{p.fixed_amount!==null?" · "+fmtMoney(p.fixed_amount,p.currency):""} · {p.verification_status==="verified"?"Verificado":"No verificado"}</p></div><small>{p.contract_id?"Vinculado a contrato":"Sin contrato asociado"}</small></div>):<p className="fanaHint">No hay participaciones registradas. Aquí se distinguirán las partes económicas de los usuarios con acceso técnico.</p>}
      {editable&&<details className="fanaOrgNested"><summary>+ Añadir participación</summary><form className="fanaOrgForm" onSubmit={saveParty}>
        <label>Parte o entidad<input required value={party.party_name} onChange={e=>setParty(v=>({...v,party_name:e.target.value}))}/></label>
        <div className="fanaOrgTwo"><label>Función<select value={party.party_role} onChange={e=>setParty(v=>({...v,party_role:e.target.value}))}>{ROLES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        <label>Relación<select value={party.relationship} onChange={e=>setParty(v=>({...v,relationship:e.target.value}))}><option value="to_verify">Por verificar</option><option value="own">Propio</option><option value="client">Cliente</option><option value="hybrid">Híbrido</option><option value="external">Externo</option></select></label></div>
        <label>Modelo económico<select value={party.fee_model} onChange={e=>setParty(v=>({...v,fee_model:e.target.value}))}><option value="unverified">Por confirmar</option><option value="fixed">Fijo</option><option value="percentage">Porcentaje</option><option value="per_service">Por servicio</option><option value="commission">Comisión</option><option value="mixed">Mixto</option></select></label>
        <div className="fanaOrgTwo"><label>Porcentaje (si consta)<input type="number" step=".001" min="0" max="100" value={party.share_percent} onChange={e=>setParty(v=>({...v,share_percent:e.target.value}))}/></label>
        <label>Monto fijo CLP (si consta)<input type="number" step="1" min="0" value={party.fixed_amount} onChange={e=>setParty(v=>({...v,fixed_amount:e.target.value}))}/></label></div>
        <label>Contrato asociado<select value={party.contract_id} onChange={e=>setParty(v=>({...v,contract_id:e.target.value}))}><option value="">Sin contrato verificado</option>{contracts.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select></label>
        <label>Observaciones<textarea rows={3} value={party.note} onChange={e=>setParty(v=>({...v,note:e.target.value}))}/></label>
        <button disabled={busy} className="fanaPrimary">Registrar como pendiente</button>
      </form></details>}
    </Details>
   </>:<Details kicker="ACCESO LIMITADO" title="Tu vínculo con FIN" defaultOpen><p className="fanaHint">Puedes reconocer la organización que te habilitó. La información contractual y las liquidaciones de otras partes permanecen reservadas. Solicita a Dirección los documentos específicos que correspondan a tu participación.</p></Details>}
   <Details kicker="03 · IDENTIDAD Y ACCESO" title="Vías de entrada y permisos" defaultOpen>
      <div className="fanaAccessRoutes">{USER_ROLES.map(([code,description])=><div key={code}><strong>{description}</strong><span>{code==="finance"?"Prepara pagos y revisa operaciones, sin aprobación bancaria":code==="business_owner"?"Visión de su organización, documentos y acuerdos":code==="accountant"?"Revisión documental, tributaria y de conciliación":code==="auditor"?"Consulta y trazabilidad, sin escritura":"Acceso limitado a su vínculo y organización"}</span></div>)}</div>
      <p className="fanaHint">El enlace de entrada no concede permisos. El rol real se valida en Supabase para cada organización. Un contrato se registra aparte y no significa acceso automático.</p>
      {director&&<><div className="fanaOrgRecord"><div><strong>Usuarios habilitados</strong><p>{members.length?members.map(m=>labelFor(USER_ROLES,m.role)+" · "+labelFor(ENTRY_PATHS,m.entry_path)).join(" / "):"Aún no hay usuarios asociados a esta organización."}</p></div></div>
        <details className="fanaOrgNested"><summary>+ Habilitar acceso a usuario existente</summary>
          <form className="fanaOrgForm" onSubmit={assignAccess}>
           <label>Correo confirmado en LINK<input required type="email" value={access.email} onChange={e=>setAccess(v=>({...v,email:e.target.value}))}/></label>
           <label>Rol<select value={access.role} onChange={e=>setAccess(v=>({...v,role:e.target.value}))}>{USER_ROLES.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
           <label>Entrada<select value={access.entry_path} onChange={e=>setAccess(v=>({...v,entry_path:e.target.value}))}>{ENTRY_PATHS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
           <button disabled={busy} className="fanaPrimary">Asignar acceso solo a esta organización</button>
          </form>
          <p className="fanaHint">Esta acción no envía correos ni crea cuentas. El destinatario debe tener una cuenta registrada y correo confirmado.</p>
        </details>
       </>}
   </Details>
 </section>;
}
