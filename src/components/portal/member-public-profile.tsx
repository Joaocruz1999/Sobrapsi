"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BRAZILIAN_STATES } from "@/lib/constants";
import {
  ProfilePhotoCropper,
  type ProfilePhotoCropperRef,
} from "@/components/portal/profile-photo-cropper";
import {
  PracticeAreasDisplay,
  PracticeAreasPicker,
} from "@/components/portal/practice-areas-picker";
import { PublicProfileSocialLinks } from "@/components/portal/public-profile-social-links";

export interface MemberPublicProfileData {
  publicName: string;
  publicCity: string;
  publicState: string;
  publicBio: string;
  publicEducationSummary: string;
  publicStudyAreas: string;
  publicWebsite: string;
  publicLinkedin: string;
  publicInstagram: string;
  publicPhotoUrl: string;
  photoUrl: string | null;
  authorizeList: boolean;
  authorizeBio: boolean;
  authorizeLinks: boolean;
  authorizePhoto: boolean;
  reviewStatus: string;
}

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  approved: "Publicado",
};

export function getPublicProfileStatusLabel(
  profile: Pick<MemberPublicProfileData, "authorizeList" | "authorizeBio">
): string {
  if (profile.authorizeList && profile.authorizeBio) return "Publicado";
  if (profile.authorizeList) return "Na consulta pública";
  return "Rascunho";
}

interface MemberPublicProfileViewProps {
  profile: MemberPublicProfileData;
  registrationNumber: string;
  onEdit: () => void;
}

export function MemberPublicProfileView({
  profile,
  registrationNumber,
  onEdit,
}: MemberPublicProfileViewProps) {
  const hasContent =
    profile.publicBio ||
    profile.publicEducationSummary ||
    profile.publicStudyAreas ||
    profile.publicWebsite ||
    profile.publicLinkedin ||
    profile.publicInstagram ||
    profile.publicCity ||
    profile.photoUrl;

  return (
    <Card className="border-white/10 bg-zinc-900/50">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>Seu perfil público</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Visualização de como suas informações estão cadastradas.
          </p>
        </div>
        <Button type="button" onClick={onEdit}>
          Editar perfil
        </Button>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={profile.publicPhotoUrl}
              src={profile.photoUrl}
              alt={`Foto de ${profile.publicName}`}
              className="h-40 w-40 shrink-0 rounded-full border-2 border-primary/40 object-cover"
            />
          ) : (
            <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-white/20 bg-zinc-800 text-sm text-muted">
              Sem foto
            </div>
          )}

          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{profile.publicName}</h2>
              <p className="mt-1 text-sm text-muted">Registro: {registrationNumber}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>{getPublicProfileStatusLabel(profile)}</Badge>
              {profile.publicState && (
                <Badge variant="outline">
                  {profile.publicCity ? `${profile.publicCity}/` : ""}
                  {profile.publicState}
                </Badge>
              )}
              {profile.authorizeList && <Badge variant="success">Na consulta pública</Badge>}
            </div>
          </div>
        </div>

        {!hasContent && (
          <p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-muted">
            Seu perfil ainda está incompleto. Clique em &quot;Editar perfil&quot; para adicionar foto,
            bio e demais informações.
          </p>
        )}

        {profile.publicBio && (
          <div>
            <h3 className="mb-2 text-lg font-bold text-white">Sobre</h3>
            <p className="leading-relaxed text-muted">{profile.publicBio}</p>
          </div>
        )}

        {profile.publicEducationSummary && (
          <div>
            <h3 className="mb-2 text-lg font-bold text-white">Formação</h3>
            <p className="text-muted">{profile.publicEducationSummary}</p>
          </div>
        )}

        {profile.publicStudyAreas && (
          <div>
            <h3 className="mb-2 text-lg font-bold text-white">Áreas de estudo / atuação</h3>
            <PracticeAreasDisplay value={profile.publicStudyAreas} />
          </div>
        )}

        {(profile.publicWebsite || profile.publicLinkedin || profile.publicInstagram) && (
          <PublicProfileSocialLinks
            website={profile.publicWebsite}
            linkedin={profile.publicLinkedin}
            instagram={profile.publicInstagram}
          />
        )}

        <div className="space-y-2 rounded-lg border border-white/10 p-4">
          <p className="text-sm font-medium text-white">Autorizações de publicação</p>
          <ul className="space-y-1 text-sm text-muted">
            <li>{profile.authorizeList ? "✓" : "✗"} Aparecer na consulta pública</li>
            <li>{profile.authorizeBio ? "✓" : "✗"} Publicar mini bio</li>
            <li>{profile.authorizeLinks ? "✓" : "✗"} Publicar links profissionais</li>
            <li>{profile.authorizePhoto ? "✓" : "✗"} Publicar foto de perfil</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

interface MemberPublicProfileEditorProps {
  initialProfile: MemberPublicProfileData;
  onCancel: () => void;
  onSaved: (profile: MemberPublicProfileData) => void;
}

export function MemberPublicProfileEditor({
  initialProfile,
  onCancel,
  onSaved,
}: MemberPublicProfileEditorProps) {
  const cropperRef = useRef<ProfilePhotoCropperRef>(null);
  const [form, setForm] = useState(initialProfile);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [newPhotoSelected, setNewPhotoSelected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      let publicPhotoUrl = form.publicPhotoUrl;
      let photoUrl = form.photoUrl;

      let photoFile = pendingPhoto;
      if (!photoFile && newPhotoSelected) {
        photoFile = (await cropperRef.current?.getCroppedFile()) ?? null;
      }

      if (newPhotoSelected && !photoFile) {
        showError("A foto ainda está carregando. Aguarde um instante e tente salvar novamente.");
        setSaving(false);
        return;
      }

      if (photoFile) {
        const uploadData = new FormData();
        uploadData.append("file", photoFile);

        const uploadRes = await fetch("/api/members/public-profile/photo", {
          method: "POST",
          body: uploadData,
        });
        const uploadJson = await uploadRes.json();

        if (!uploadRes.ok) {
          showError(uploadJson.error ?? "Erro ao enviar foto");
          setSaving(false);
          return;
        }

        publicPhotoUrl = uploadJson.publicPhotoUrl;
        photoUrl = uploadJson.photoUrl ?? form.photoUrl;
      }

      const res = await fetch("/api/members/public-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicName: form.publicName,
          publicCity: form.publicCity,
          publicState: form.publicState,
          publicBio: form.publicBio,
          publicEducationSummary: form.publicEducationSummary,
          publicStudyAreas: form.publicStudyAreas,
          publicWebsite: form.publicWebsite,
          publicLinkedin: form.publicLinkedin,
          publicInstagram: form.publicInstagram,
          publicPhotoUrl: publicPhotoUrl || undefined,
          authorizeList: form.authorizeList,
          authorizeBio: form.authorizeBio,
          authorizeLinks: form.authorizeLinks,
          authorizePhoto: form.authorizePhoto,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data.error ?? "Erro ao salvar perfil");
        setSaving(false);
        return;
      }

      setSaving(false);
      onSaved({
        ...data.profile,
        photoUrl: data.profile.photoUrl ?? photoUrl,
      });
    } catch {
      showError("Erro ao salvar perfil");
      setSaving(false);
    }
  }

  return (
    <Card className="border-white/10 bg-zinc-900/50">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>Editar perfil público</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Ajuste foto, textos e autorizações. As alterações ficam públicas assim que você salvar.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <ProfilePhotoCropper
            ref={cropperRef}
            currentPhotoUrl={form.photoUrl}
            onPhotoReady={(file) => {
              setPendingPhoto(file);
              if (file) setNewPhotoSelected(false);
            }}
            onPhotoSelected={() => setNewPhotoSelected(true)}
          />
          {newPhotoSelected && !pendingPhoto && (
            <p className="text-xs text-muted">
              Preparando a foto para envio...
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="publicName">Nome público</Label>
            <Input
              id="publicName"
              value={form.publicName}
              onChange={(e) => setForm({ ...form, publicName: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="publicCity">Cidade</Label>
              <Input
                id="publicCity"
                value={form.publicCity}
                onChange={(e) => setForm({ ...form, publicCity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publicState">UF</Label>
              <select
                id="publicState"
                value={form.publicState}
                onChange={(e) => setForm({ ...form, publicState: e.target.value })}
                className="flex h-11 w-full rounded-lg border border-border bg-zinc-900 px-4 text-sm text-white"
              >
                <option value="">Selecione</option>
                {BRAZILIAN_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="publicBio">Mini bio</Label>
            <Textarea
              id="publicBio"
              value={form.publicBio}
              onChange={(e) => setForm({ ...form, publicBio: e.target.value })}
              maxLength={600}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="publicEducationSummary">Resumo da formação</Label>
            <Textarea
              id="publicEducationSummary"
              value={form.publicEducationSummary}
              onChange={(e) => setForm({ ...form, publicEducationSummary: e.target.value })}
              rows={3}
            />
          </div>

          <PracticeAreasPicker
            label="Áreas de estudo / atuação"
            value={form.publicStudyAreas}
            onChange={(publicStudyAreas) => setForm({ ...form, publicStudyAreas })}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="publicWebsite">Site</Label>
              <Input
                id="publicWebsite"
                value={form.publicWebsite}
                onChange={(e) => setForm({ ...form, publicWebsite: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publicLinkedin">LinkedIn</Label>
              <Input
                id="publicLinkedin"
                value={form.publicLinkedin}
                onChange={(e) => setForm({ ...form, publicLinkedin: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publicInstagram">Instagram</Label>
              <Input
                id="publicInstagram"
                value={form.publicInstagram}
                onChange={(e) => setForm({ ...form, publicInstagram: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-white/10 p-4">
            <p className="text-sm font-medium text-white">Autorizações de publicação</p>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={form.authorizeList}
                onChange={(e) => setForm({ ...form, authorizeList: e.target.checked })}
              />
              Autorizo aparecer na consulta pública de associados
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={form.authorizeBio}
                onChange={(e) => setForm({ ...form, authorizeBio: e.target.checked })}
              />
              Autorizo publicar mini bio
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={form.authorizeLinks}
                onChange={(e) => setForm({ ...form, authorizeLinks: e.target.checked })}
              />
              Autorizo publicar links profissionais
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={form.authorizePhoto}
                onChange={(e) => setForm({ ...form, authorizePhoto: e.target.checked })}
              />
              Autorizo publicar foto de perfil
            </label>
          </div>

          {error && (
            <p ref={errorRef} className="text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={saving || (newPhotoSelected && !pendingPhoto)}
            >
              {saving
                ? "Salvando..."
                : newPhotoSelected && !pendingPhoto
                  ? "Preparando foto..."
                  : "Salvar perfil público"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
