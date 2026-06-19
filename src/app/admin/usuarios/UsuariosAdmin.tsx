"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import LoadingOverlay from "@/components/LoadingOverlay";
import Modal from "@/components/Modal";
import type { Perfil } from "@/lib/types";
import type { UsuarioAdmin } from "@/lib/usuarios";

const PERFILES: { value: Perfil; label: string }[] = [
  { value: "vendedor", label: "Vendedor" },
  { value: "despachador", label: "Despachador" },
  { value: "facturador", label: "Facturador" },
  { value: "admin", label: "Administrador" },
];

const labelCls =
  "mt-3 mb-1 block text-xs font-bold tracking-wider text-muted uppercase";
const inputCls =
  "w-full rounded-lg border border-line-strong bg-surface-2 px-4 py-3 text-base text-white transition-colors focus:border-accent focus:shadow-[0_0_0_2px_rgba(255,59,59,0.12)] focus:outline-none";

function perfilLabel(p: Perfil): string {
  return PERFILES.find((x) => x.value === p)?.label ?? p;
}

export default function UsuariosAdmin({
  sesionId,
  configurado,
}: {
  sesionId: string;
  configurado: boolean;
}) {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal crear / editar
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);
  const [creando, setCreando] = useState(false);
  const [fEmail, setFEmail] = useState("");
  const [fNombre, setFNombre] = useState("");
  const [fPerfil, setFPerfil] = useState<Perfil>("vendedor");

  // Modal de contraseña temporal generada
  const [passwordInfo, setPasswordInfo] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function cargar() {
    try {
      const res = await fetch("/api/admin/usuarios");
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error");
      setUsuarios(body as UsuarioAdmin[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando usuarios");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void (async () => {
      await cargar();
    })();
  }, []);

  function abrirCrear() {
    setEditando(null);
    setFEmail("");
    setFNombre("");
    setFPerfil("vendedor");
    setCreando(true);
  }

  function abrirEditar(u: UsuarioAdmin) {
    setCreando(false);
    setEditando(u);
    setFEmail(u.email);
    setFNombre(u.nombre);
    setFPerfil(u.perfil);
  }

  function cerrarForm() {
    setCreando(false);
    setEditando(null);
  }

  async function guardar() {
    setTrabajando(true);
    setError(null);
    try {
      if (creando) {
        const res = await fetch("/api/admin/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: fEmail,
            nombre: fNombre,
            perfil: fPerfil,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "Error");
        cerrarForm();
        await cargar();
        setPasswordInfo({ email: fEmail.trim(), password: body.passwordTemporal });
      } else if (editando) {
        const res = await fetch(`/api/admin/usuarios/${editando.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: fNombre, perfil: fPerfil }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "Error");
        cerrarForm();
        await cargar();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    } finally {
      setTrabajando(false);
    }
  }

  async function resetear(u: UsuarioAdmin) {
    if (!confirm(`¿Generar una contraseña temporal nueva para ${u.email}?`)) {
      return;
    }
    setTrabajando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}/password`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error");
      setPasswordInfo({ email: u.email, password: body.passwordTemporal });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error reseteando");
    } finally {
      setTrabajando(false);
    }
  }

  async function alternarEstado(u: UsuarioAdmin) {
    const accion = u.activo ? "desactivar" : "activar";
    if (!confirm(`¿Seguro que quieres ${accion} a ${u.email}?`)) return;
    setTrabajando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !u.activo }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error");
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cambiando estado");
    } finally {
      setTrabajando(false);
    }
  }

  async function eliminar(u: UsuarioAdmin) {
    if (
      !confirm(
        `¿Eliminar definitivamente a ${u.email}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setTrabajando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error");
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error eliminando");
    } finally {
      setTrabajando(false);
    }
  }

  async function copiarPassword() {
    if (!passwordInfo) return;
    try {
      await navigator.clipboard.writeText(passwordInfo.password);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* el usuario puede copiar a mano */
    }
  }

  return (
    <div className="min-h-screen pb-16">
      <AppHeader titulo="Administrar usuarios" />

      <div className="mx-auto w-full max-w-[960px] px-4 py-4">
        {!configurado && (
          <div className="mb-4 rounded-lg border border-wine bg-wine/30 px-4 py-3 text-sm text-[#ff6b6b]">
            Falta <code>SUPABASE_SERVICE_ROLE_KEY</code> en el servidor. Se
            muestran datos de ejemplo; crear/editar no persiste.
          </div>
        )}

        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-sm text-muted-2">
            {usuarios.length} usuario{usuarios.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={abrirCrear}
            className="rounded-md bg-ok px-4 py-2.5 text-sm font-bold text-white transition-opacity active:opacity-85"
          >
            + Crear usuario
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-wine bg-wine/30 px-4 py-3 text-sm text-[#ff6b6b]">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs tracking-wider text-muted uppercase">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-line-soft">
                  <td className="px-4 py-3 font-semibold text-white">
                    {u.nombre}
                    {u.debeCambiarPassword && (
                      <span className="ml-2 rounded bg-wine/40 px-1.5 py-0.5 text-[10px] text-[#ffb3b3]">
                        clave temporal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-2">{u.email}</td>
                  <td className="px-4 py-3">{perfilLabel(u.perfil)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.activo ? "text-[#1e9b3c]" : "text-[#ff6b6b]"
                      }
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        onClick={() => abrirEditar(u)}
                        className="rounded border border-line-strong px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-white"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => resetear(u)}
                        className="rounded border border-line-strong px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-white"
                      >
                        Resetear clave
                      </button>
                      {u.id !== sesionId && (
                        <>
                          <button
                            onClick={() => alternarEstado(u)}
                            className="rounded border border-line-strong px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-white"
                          >
                            {u.activo ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            onClick={() => eliminar(u)}
                            className="rounded border border-wine px-2.5 py-1.5 text-xs text-[#ff6b6b] transition-colors hover:bg-wine/30"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!cargando && usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-2">
                    No hay usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear / editar */}
      <Modal abierto={creando || Boolean(editando)} onCerrar={cerrarForm}>
        <h2 className="text-xl font-bold tracking-wide uppercase">
          {creando ? "Crear usuario" : "Editar usuario"}
        </h2>

        <div className="mt-4 text-left">
          <label className={labelCls}>Correo</label>
          <input
            type="email"
            value={fEmail}
            disabled={!creando}
            onChange={(e) => setFEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            autoCapitalize="none"
            className={`${inputCls} disabled:opacity-60`}
          />

          <label className={labelCls}>Nombre (se muestra como vendedor)</label>
          <input
            type="text"
            value={fNombre}
            onChange={(e) => setFNombre(e.target.value)}
            placeholder="Nombre y apellido"
            className={inputCls}
          />

          <label className={labelCls}>Perfil</label>
          <select
            value={fPerfil}
            onChange={(e) => setFPerfil(e.target.value as Perfil)}
            className={inputCls}
          >
            {PERFILES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={cerrarForm}
            className="flex-1 rounded-md border border-line-strong py-3 text-sm font-bold text-muted transition-colors hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            className="flex-1 rounded-md bg-wine py-3 text-sm font-bold text-white transition-opacity active:opacity-85"
          >
            {creando ? "Crear" : "Guardar"}
          </button>
        </div>
      </Modal>

      {/* Modal contraseña temporal */}
      <Modal abierto={Boolean(passwordInfo)} onCerrar={() => setPasswordInfo(null)}>
        {passwordInfo && (
          <>
            <h2 className="text-xl font-bold tracking-wide uppercase">
              Contraseña temporal
            </h2>
            <p className="mt-2 text-sm text-muted-2">
              Para <strong className="text-white">{passwordInfo.email}</strong>.
              Recuerda copiar la contraseña y enviarsela al usuario; se le pedirá cambiarla al primer ingreso.
            </p>

            <div className="my-4 rounded-lg border border-line bg-surface-2 px-4 py-3 text-center text-lg font-bold tracking-wide text-accent select-all">
              {passwordInfo.password}
            </div>

            <div className="flex gap-3">
              <button
                onClick={copiarPassword}
                className="flex-1 rounded-md bg-wine py-3 text-sm font-bold text-white transition-opacity active:opacity-85"
              >
                {copiado ? "¡Copiada!" : "Copiar"}
              </button>
              <button
                onClick={() => setPasswordInfo(null)}
                className="flex-1 rounded-md border border-line-strong py-3 text-sm font-bold text-muted transition-colors hover:text-white"
              >
                Listo
              </button>
            </div>
          </>
        )}
      </Modal>

      <LoadingOverlay visible={cargando || trabajando} texto="Procesando..." />
    </div>
  );
}
