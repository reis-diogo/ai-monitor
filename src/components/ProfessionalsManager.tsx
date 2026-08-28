"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { CommitActivity, Professional, ProfessionalRole } from "@/lib/types";
import { RoleToggle } from "@/components/RoleToggle";
import { AvatarCropModal } from "@/components/AvatarCropModal";
import { AvatarPreviewModal } from "@/components/AvatarPreviewModal";
import { ChevronIcon, CloseIcon } from "@/components/icons";

async function uploadAvatarBlob(blob: Blob): Promise<{ url: string | null; error: string | null }> {
  const formData = new FormData();
  formData.append("file", blob, "avatar.jpg");

  const res = await fetch("/api/avatar", { method: "POST", body: formData });
  const data = await res.json();

  if (!res.ok) {
    return { url: null, error: data.error ?? "Erro ao enviar imagem." };
  }
  return { url: data.url, error: null };
}

export function ProfessionalsManager({
  commits,
  onChange,
}: {
  commits: CommitActivity[];
  onChange: () => void;
}) {
  const [professionals, setProfessionals] = useState<Professional[] | null>(null);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<ProfessionalRole>("po");
  const [newEmail, setNewEmail] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<"new" | string | null>(null);
  const [uploading, setUploading] = useState<"new" | string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [previewTarget, setPreviewTarget] = useState<"new" | string | null>(null);
  const [aliasEditingFor, setAliasEditingFor] = useState<string | null>(null);
  const [aliasDraft, setAliasDraft] = useState("");
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [emailEditingFor, setEmailEditingFor] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState("");

  useEffect(() => {
    fetch("/api/professionals")
      .then((res) => res.json())
      .then((data) => setProfessionals(data.professionals));
  }, []);

  async function handleSetRole(
    authorName: string,
    role: ProfessionalRole,
    extra?: { clickupEmail?: string; avatarUrl?: string }
  ) {
    const res = await fetch("/api/professionals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName, role, ...extra }),
    });
    const data = await res.json();
    setProfessionals(data.professionals);
    onChange();
  }

  function triggerUpload(target: "new" | string) {
    setUploadTarget(target);
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setCropFile(file);
  }

  async function handleCropConfirm(blob: Blob) {
    const target = uploadTarget;
    setCropFile(null);
    if (!target) return;

    setUploading(target);
    setAvatarError(null);
    const { url, error } = await uploadAvatarBlob(blob);

    if (error) {
      setAvatarError(error);
    } else if (url) {
      if (target === "new") {
        setNewAvatarUrl(url);
      } else {
        const professional = professionals?.find((p) => p.authorName === target);
        await handleSetRole(target, professional?.role ?? "dev", {
          clickupEmail: professional?.clickupEmail,
          avatarUrl: url,
        });
      }
    }

    setUploading(null);
    setUploadTarget(null);
  }

  async function handleAddAlias(authorName: string) {
    if (!aliasDraft.trim()) return;
    setAliasError(null);
    const res = await fetch("/api/professionals/alias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName, alias: aliasDraft.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAliasError(data.error ?? "Erro ao adicionar apelido.");
      return;
    }
    setProfessionals(data.professionals);
    setAliasDraft("");
    onChange();
  }

  async function handleSaveEmail(authorName: string) {
    const professional = professionals?.find((p) => p.authorName === authorName);
    await handleSetRole(authorName, professional?.role ?? "po", {
      clickupEmail: emailDraft.trim() || undefined,
      avatarUrl: professional?.avatarUrl,
    });
    setEmailEditingFor(null);
  }

  async function handleRemoveAlias(authorName: string, alias: string) {
    const res = await fetch("/api/professionals/alias", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName, alias }),
    });
    const data = await res.json();
    setProfessionals(data.professionals);
    onChange();
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    await handleSetRole(newName.trim(), newRole, {
      clickupEmail: newEmail.trim() || undefined,
      avatarUrl: newAvatarUrl.trim() || undefined,
    });
    setNewName("");
    setNewEmail("");
    setNewAvatarUrl("");
    setAdding(false);
  }

  const aliasedRawNames = new Set(
    (professionals ?? []).flatMap((p) => (p.aliases ?? []).map((a) => a.toLowerCase()))
  );

  const discoveredAuthors = Array.from(
    new Map(
      commits
        .filter((c) => !aliasedRawNames.has(c.authorName.toLowerCase()))
        .map((c) => [c.authorName, { name: c.authorName, avatarUrl: c.authorAvatarUrl }])
    ).values()
  );

  const peopleMap = new Map<string, { name: string; avatarUrl: string | null }>();
  for (const author of discoveredAuthors) {
    peopleMap.set(author.name, author);
  }
  for (const p of professionals ?? []) {
    if (p.avatarUrl) {
      peopleMap.set(p.authorName, { name: p.authorName, avatarUrl: p.avatarUrl });
    } else if (!peopleMap.has(p.authorName)) {
      peopleMap.set(p.authorName, { name: p.authorName, avatarUrl: null });
    }
  }
  const people = Array.from(peopleMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const classifiedCount = people.filter((p) =>
    professionals?.some((prof) => prof.authorName === p.name)
  ).length;

  const previewAvatarUrl =
    previewTarget === "new"
      ? newAvatarUrl || null
      : previewTarget
        ? (people.find((p) => p.name === previewTarget)?.avatarUrl ?? null)
        : null;
  const previewName = previewTarget === "new" ? "Nova pessoa" : previewTarget;

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-sm text-black/60 dark:text-white/60"
      >
        <span>
          Profissionais {professionals ? `(${classifiedCount}/${people.length} classificados)` : ""}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-4 w-4 shrink-0 items-center justify-center text-black/30 dark:text-white/30"
        >
          <ChevronIcon />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 border-t border-black/10 dark:border-white/10 px-5 py-4">
              <div className="flex flex-col gap-2 rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-3">
                <p className="text-[11px] text-black/40 dark:text-white/40">Adicionar pessoa manualmente</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nome"
                    className="min-w-0 flex-1 rounded-md border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-2.5 py-1.5 text-sm outline-none placeholder:text-black/30 dark:text-white/30 focus:border-black/30 dark:focus:border-white/30"
                  />
                  {newRole === "po" && (
                    <input
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="E-mail do ClickUp"
                      className="min-w-0 flex-1 rounded-md border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-2.5 py-1.5 text-sm outline-none placeholder:text-black/30 dark:text-white/30 focus:border-black/30 dark:focus:border-white/30"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      newAvatarUrl ? setPreviewTarget("new") : triggerUpload("new")
                    }
                    className="shrink-0"
                  >
                    {newAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={newAvatarUrl} alt="preview" className="h-8 w-8 rounded-full" />
                    ) : (
                      <span className="rounded-md border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-2.5 py-1.5 text-xs text-black/60 dark:text-white/60 hover:border-black/30 dark:hover:border-white/30">
                        {uploading === "new" ? "enviando..." : "foto (opcional)"}
                      </span>
                    )}
                  </button>

                  <RoleToggle groupId="new-professional" value={newRole} onChange={setNewRole} />
                  <motion.button
                    onClick={handleAdd}
                    disabled={adding || !newName.trim()}
                    whileHover={!adding ? { scale: 1.04 } : undefined}
                    whileTap={!adding ? { scale: 0.96 } : undefined}
                    className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-40"
                  >
                    adicionar
                  </motion.button>
                </div>
              </div>

              <AnimatePresence>
                {avatarError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden text-xs text-red-400"
                  >
                    {avatarError}
                  </motion.p>
                )}
              </AnimatePresence>

              <ul className="flex flex-col gap-2">
                {people.map((person) => {
                  const professional = professionals?.find((p) => p.authorName === person.name);
                  const isUploadingAvatar = uploading === person.name;

                  const isEditingAlias = aliasEditingFor === person.name;

                  return (
                    <li key={person.name} className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            person.avatarUrl
                              ? setPreviewTarget(person.name)
                              : triggerUpload(person.name)
                          }
                          title={person.avatarUrl ? "Ver foto" : "Adicionar foto"}
                          className="relative shrink-0"
                        >
                          {person.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={person.avatarUrl}
                              alt={person.name}
                              className="h-6 w-6 rounded-full hover:opacity-70"
                            />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/10 dark:bg-white/10 text-[9px] font-medium hover:bg-black/20 dark:hover:bg-white/20">
                              {isUploadingAvatar ? "..." : person.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </button>
                        <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
                          <span className="truncate text-sm text-black/70 dark:text-white/70">{person.name}</span>
                          {professional?.aliases && professional.aliases.length > 0 && (
                            <span className="shrink-0 truncate rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 text-[10px] text-black/40 dark:text-white/40">
                              {professional.aliases.join(", ")}
                            </span>
                          )}
                        </span>
                        {professional?.role === "po" &&
                          (emailEditingFor === person.name ? (
                            <div className="flex items-center gap-1">
                              <input
                                autoFocus
                                value={emailDraft}
                                onChange={(e) => setEmailDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEmail(person.name);
                                  if (e.key === "Escape") setEmailEditingFor(null);
                                }}
                                placeholder="e-mail do ClickUp"
                                className="min-w-0 max-w-[180px] rounded-md border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-2 py-1 text-[11px] outline-none placeholder:text-black/30 dark:text-white/30 focus:border-black/30 dark:focus:border-white/30"
                              />
                              <button
                                onClick={() => handleSaveEmail(person.name)}
                                className="text-[11px] text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                              >
                                salvar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEmailEditingFor(person.name);
                                setEmailDraft(professional.clickupEmail ?? "");
                              }}
                              className="truncate text-[11px] text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60"
                            >
                              {professional.clickupEmail ?? "sem e-mail do ClickUp"}
                            </button>
                          ))}
                        <button
                          onClick={() => {
                            setAliasEditingFor(isEditingAlias ? null : person.name);
                            setAliasError(null);
                          }}
                          className="text-[11px] text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60"
                        >
                          apelidos{professional?.aliases?.length ? ` (${professional.aliases.length})` : ""}
                        </button>
                        <RoleToggle
                          groupId={person.name}
                          value={professional?.role ?? null}
                          onChange={(nextRole) =>
                            handleSetRole(person.name, nextRole, {
                              clickupEmail: professional?.clickupEmail,
                              avatarUrl: professional?.avatarUrl,
                            })
                          }
                        />
                      </div>

                      <AnimatePresence initial={false}>
                        {isEditingAlias && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden pl-9"
                          >
                            <div className="flex flex-col gap-2 pb-1">
                              <p className="text-[10px] text-black/30 dark:text-white/30">
                                outros usernames/nomes que são essa mesma pessoa (ex: outra conta
                                do GitHub)
                              </p>
                              {professional?.aliases && professional.aliases.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {professional.aliases.map((alias) => (
                                    <span
                                      key={alias}
                                      className="flex items-center gap-1 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-2 py-1 text-[11px] text-black/60 dark:text-white/60"
                                    >
                                      {alias}
                                      <button
                                        onClick={() => handleRemoveAlias(person.name, alias)}
                                        className="flex h-3.5 w-3.5 items-center justify-center text-black/30 dark:text-white/30 hover:text-red-400"
                                      >
                                        <CloseIcon size={9} />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <input
                                  value={aliasDraft}
                                  onChange={(e) => setAliasDraft(e.target.value)}
                                  placeholder="username"
                                  className="min-w-0 flex-1 rounded-md border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-2.5 py-1.5 text-xs outline-none placeholder:text-black/30 dark:text-white/30 focus:border-black/30 dark:focus:border-white/30"
                                />
                                <motion.button
                                  onClick={() => handleAddAlias(person.name)}
                                  disabled={!aliasDraft.trim()}
                                  whileHover={aliasDraft.trim() ? { scale: 1.04 } : undefined}
                                  whileTap={aliasDraft.trim() ? { scale: 0.96 } : undefined}
                                  className="rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background disabled:opacity-40"
                                >
                                  adicionar
                                </motion.button>
                              </div>
                              {aliasError && (
                                <p className="text-[11px] text-red-400">{aliasError}</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onCancel={() => {
            setCropFile(null);
            setUploadTarget(null);
          }}
          onConfirm={handleCropConfirm}
        />
      )}

      <AvatarPreviewModal
        name={previewName}
        avatarUrl={previewAvatarUrl}
        onClose={() => setPreviewTarget(null)}
        onChangePhoto={() => {
          const target = previewTarget;
          setPreviewTarget(null);
          if (target) triggerUpload(target);
        }}
      />
    </div>
  );
}
