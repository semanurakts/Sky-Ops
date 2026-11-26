
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../auth/useAuth";
import "./UserManagementPage.css";

type UserRole = "ADMIN" | "STAFF" | "PASSENGER";

interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  personnelId: string | null;
  createdAt: string;
  updatedAt: string;
  personnel: {
    id: string;
    name: string;
    role: string;
  } | null;
}

interface PersonnelOption {
  id: string;
  name: string;
  role: string;
  status: string;
}

interface UsersResponse {
  users: AdminUser[];
}

interface PersonnelResponse {
  personnel: PersonnelOption[];
}

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

interface UserManagementData {
  users: AdminUser[];
  personnelOptions: PersonnelOption[];
}

const API_URL = "/api/admin/users";

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const result: unknown =
    response.status === 204
      ? null
      : await response.json().catch(() => null);

  if (!response.ok) {
    const apiError = result as ApiErrorResponse | null;

    throw new Error(
      apiError?.error?.message ??
        `Request failed with status ${response.status}`,
    );
  }

  return result as T;
}

interface UserManagementPageProps {
  language: "tr" | "en";
}

function UserManagementPage({ language }: UserManagementPageProps) {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [personnelOptions, setPersonnelOptions] = useState<PersonnelOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [personnelId, setPersonnelId] = useState("");

  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>({});
  const [personnelDrafts, setPersonnelDrafts] = useState<Record<string, string>>({});

  const tr = language === "tr";

  const text = {
    title: tr ? "Kullanıcı Yönetimi" : "User Management",
    description: tr
      ? "Sistem hesaplarını ve personel erişimlerini yönetin."
      : "Manage system accounts and personnel access.",
    createTitle: tr ? "Yeni Personel Hesabı" : "Create Staff Account",
    email: tr ? "E-posta adresi" : "Email address",
    password: tr ? "Geçici şifre" : "Temporary password",
    passwordHint: tr
      ? "En az 14 karakter."
      : "At least 14 characters.",
    personnel: tr ? "Personel kaydı" : "Personnel record",
    choosePersonnel: tr
      ? "Personel seçin"
      : "Select personnel",
    create: tr ? "Hesap Oluştur" : "Create Account",
    creating: tr ? "Oluşturuluyor..." : "Creating...",
    listTitle: tr ? "Kullanıcı Hesapları" : "User Accounts",
    refresh: tr ? "Yenile" : "Refresh",
    account: tr ? "Hesap" : "Account",
    role: tr ? "Rol" : "Role",
    linkedPersonnel: tr ? "Bağlı Personel" : "Linked Personnel",
    status: tr ? "Durum" : "Status",
    actions: tr ? "İşlemler" : "Actions",
    active: tr ? "Aktif" : "Active",
    inactive: tr ? "Pasif" : "Inactive",
    activate: tr ? "Etkinleştir" : "Activate",
    deactivate: tr ? "Devre dışı bırak" : "Deactivate",
    save: tr ? "Kaydet" : "Save",
    loading: tr ? "Kullanıcılar yükleniyor..." : "Loading users...",
    empty: tr ? "Henüz kullanıcı bulunamadı." : "No users found.",
    noPersonnel: tr
      ? "Bağlanabilecek personel kaydı bulunamadı."
      : "No unlinked personnel records available.",
    selectPersonnel: tr
      ? "Bu rol için personel seçmelisiniz."
      : "Select a personnel record for this role.",
    self: tr ? "Siz" : "You",
    roles: {
      ADMIN: "ADMIN",
      STAFF: "STAFF",
      PASSENGER: tr ? "Yolcu" : "Passenger",
    },
  };

  // Fetch data without updating React state.
  // This function can safely be used by the initial effect.
  const fetchData = useCallback(async (): Promise<UserManagementData> => {
    const [userResult, personnelResult] = await Promise.all([
      apiRequest<UsersResponse>(""),
      apiRequest<PersonnelResponse>("/personnel-options"),
    ]);

    return {
      users: userResult.users,
      personnelOptions: personnelResult.personnel,
    };
  }, []);

  // Reload data after a user action.
  // State updates here are triggered by an event, not by the initial effect.
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const data = await fetchData();

      setUsers(data.users);
      setPersonnelOptions(data.personnelOptions);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load user accounts.",
      );
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // Initial data loading.
  // State updates happen after the asynchronous request completes.
  useEffect(() => {
    let isActive = true;

    fetchData()
      .then((data) => {
        if (!isActive) return;

        setUsers(data.users);
        setPersonnelOptions(data.personnelOptions);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!isActive) return;

        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load user accounts.",
        );
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [fetchData]);

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setNotice(null);

    if (!personnelId) {
      setNotice({
        type: "error",
        message: text.selectPersonnel,
      });
      return;
    }

    setSaving(true);

    try {
      await apiRequest("", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          personnelId,
        }),
      });

      setEmail("");
      setPassword("");
      setPersonnelId("");

      setNotice({
        type: "success",
        message: tr
          ? "Personel hesabı başarıyla oluşturuldu."
          : "Staff account created successfully.",
      });

      await loadData();
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Account creation failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleUpdate(account: AdminUser) {
    const nextRole = roleDrafts[account.id] ?? account.role;

    const nextPersonnelId =
      personnelDrafts[account.id] ?? account.personnelId ?? "";

    if (nextRole === "STAFF" && !nextPersonnelId) {
      setNotice({
        type: "error",
        message: text.selectPersonnel,
      });
      return;
    }

    if (
      nextRole === account.role &&
      (nextRole !== "STAFF" ||
        nextPersonnelId === account.personnelId)
    ) {
      return;
    }

    setBusyUserId(account.id);
    setNotice(null);

    try {
      await apiRequest(`/${encodeURIComponent(account.id)}/role`, {
        method: "PATCH",
        body: JSON.stringify({
          role: nextRole,
          ...(nextRole === "STAFF"
            ? { personnelId: nextPersonnelId }
            : {}),
        }),
      });

      setNotice({
        type: "success",
        message: tr
          ? "Kullanıcı rolü güncellendi."
          : "User role updated.",
      });

      setRoleDrafts((current) => {
        const updated = { ...current };
        delete updated[account.id];
        return updated;
      });

      setPersonnelDrafts((current) => {
        const updated = { ...current };
        delete updated[account.id];
        return updated;
      });

      await loadData();
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Role update failed.",
      });
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleStatusToggle(account: AdminUser) {
    const nextStatus = !account.isActive;

    const confirmation = tr
      ? `Bu hesabı ${nextStatus ? "aktif" : "pasif"} yapmak istiyor musunuz?`
      : `Do you want to ${nextStatus ? "activate" : "deactivate"} this account?`;

    if (!window.confirm(confirmation)) {
      return;
    }

    setBusyUserId(account.id);
    setNotice(null);

    try {
      await apiRequest(`/${encodeURIComponent(account.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          isActive: nextStatus,
        }),
      });

      setNotice({
        type: "success",
        message: tr
          ? "Hesap durumu güncellendi."
          : "Account status updated.",
      });

      await loadData();
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Status update failed.",
      });
    } finally {
      setBusyUserId(null);
    }
  }

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat(
      tr ? "tr-TR" : "en-US",
      { dateStyle: "medium" },
    ).format(new Date(value));
  }

  return (
    <section className="user-management">
      <header className="user-management-heading">
        <div>
          <h1>{text.title}</h1>
          <p>{text.description}</p>
        </div>

        <button
          type="button"
          className="user-management-refresh"
          onClick={() => void loadData()}
          disabled={loading}
        >
          <i className="fa-solid fa-rotate" />
          {text.refresh}
        </button>
      </header>

      {notice && (
        <div
          className={`user-management-notice ${notice.type}`}
          role="status"
        >
          <i
            className={`fa-solid ${
              notice.type === "success"
                ? "fa-circle-check"
                : "fa-circle-exclamation"
            }`}
          />
          <span>{notice.message}</span>
        </div>
      )}

      {loadError && (
        <div className="user-management-notice error" role="alert">
          <i className="fa-solid fa-circle-exclamation" />
          <span>{loadError}</span>
        </div>
      )}

      <section className="user-management-card">
        <div className="user-management-card-heading">
          <div className="user-management-card-icon">
            <i className="fa-solid fa-user-plus" />
          </div>

          <div>
            <h2>{text.createTitle}</h2>
            <p>
              {tr
                ? "Mevcut bir personel kaydına yeni bir STAFF hesabı bağlayın."
                : "Create a STAFF account linked to an existing personnel record."}
            </p>
          </div>
        </div>

        <form
          className="user-management-form"
          onSubmit={handleCreateAccount}
        >
          <div className="user-management-field">
            <label htmlFor="new-user-email">{text.email}</label>
            <input
              id="new-user-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              autoComplete="email"
              required
            />
          </div>

          <div className="user-management-field">
            <label htmlFor="new-user-password">{text.password}</label>
            <input
              id="new-user-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={14}
              maxLength={1024}
              autoComplete="new-password"
              required
            />
            <small>{text.passwordHint}</small>
          </div>

          <div className="user-management-field">
            <label htmlFor="new-user-personnel">{text.personnel}</label>
            <select
              id="new-user-personnel"
              value={personnelId}
              onChange={(event) => setPersonnelId(event.target.value)}
              required
            >
              <option value="">{text.choosePersonnel}</option>

              {personnelOptions.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} — {person.role} ({person.id})
                </option>
              ))}
            </select>

            {personnelOptions.length === 0 && (
              <small>{text.noPersonnel}</small>
            )}
          </div>

          <div className="user-management-form-action">
            <button
              type="submit"
              className="user-management-primary-button"
              disabled={saving || personnelOptions.length === 0}
            >
              <i className="fa-solid fa-user-plus" />
              {saving ? text.creating : text.create}
            </button>
          </div>
        </form>
      </section>

      <section className="user-management-card">
        <div className="user-management-list-heading">
          <div>
            <h2>{text.listTitle}</h2>
            <p>
              {users.length} {tr ? "hesap" : "accounts"}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="user-management-empty">{text.loading}</p>
        ) : users.length === 0 ? (
          <p className="user-management-empty">{text.empty}</p>
        ) : (
          <div className="user-management-table-wrapper">
            <table className="user-management-table">
              <thead>
                <tr>
                  <th>{text.account}</th>
                  <th>{text.role}</th>
                  <th>{text.linkedPersonnel}</th>
                  <th>{text.status}</th>
                  <th>{text.actions}</th>
                </tr>
              </thead>

              <tbody>
                {users.map((account) => {
                  const selectedRole =
                    roleDrafts[account.id] ?? account.role;

                  const selectedPersonnel =
                    personnelDrafts[account.id] ??
                    account.personnelId ??
                    "";

                  const isSelf = currentUser?.id === account.id;
                  const isBusy = busyUserId === account.id;

                  return (
                    <tr key={account.id}>
                      <td>
                        <div className="user-management-account">
                          <strong>
                            {account.email}

                            {isSelf && (
                              <span className="user-management-self">
                                {text.self}
                              </span>
                            )}
                          </strong>

                          <small>{formatDate(account.createdAt)}</small>
                        </div>
                      </td>

                      <td>
                        <select
                          className="user-management-role-select"
                          value={selectedRole}
                          disabled={isBusy || isSelf}
                          onChange={(event) =>
                            setRoleDrafts((current) => ({
                              ...current,
                              [account.id]: event.target.value as UserRole,
                            }))
                          }
                          aria-label={`${text.role}: ${account.email}`}
                        >
                          <option value="ADMIN">{text.roles.ADMIN}</option>
                          <option value="STAFF">{text.roles.STAFF}</option>
                          <option value="PASSENGER">
                            {text.roles.PASSENGER}
                          </option>
                        </select>

                        {selectedRole === "STAFF" &&
                          !account.personnelId && (
                            <select
                              className="user-management-personnel-select"
                              value={selectedPersonnel}
                              disabled={isBusy}
                              onChange={(event) =>
                                setPersonnelDrafts((current) => ({
                                  ...current,
                                  [account.id]: event.target.value,
                                }))
                              }
                              aria-label={`${text.personnel}: ${account.email}`}
                            >
                              <option value="">
                                {text.choosePersonnel}
                              </option>

                              {personnelOptions.map((person) => (
                                <option key={person.id} value={person.id}>
                                  {person.name} — {person.role}
                                </option>
                              ))}
                            </select>
                          )}
                      </td>

                      <td>
                        {account.personnel ? (
                          <div className="user-management-person">
                            <strong>{account.personnel.name}</strong>
                            <small>{account.personnel.role}</small>
                          </div>
                        ) : (
                          <span className="user-management-muted">—</span>
                        )}
                      </td>

                      <td>
                        <span
                          className={`user-management-status ${
                            account.isActive ? "active" : "inactive"
                          }`}
                        >
                          {account.isActive ? text.active : text.inactive}
                        </span>
                      </td>

                      <td>
                        <div className="user-management-actions">
                          <button
                            type="button"
                            className="user-management-save-button"
                            disabled={
                              isBusy ||
                              (selectedRole === account.role &&
                                (selectedRole !== "STAFF" ||
                                  selectedPersonnel === account.personnelId))
                            }
                            onClick={() => void handleRoleUpdate(account)}
                          >
                            {text.save}
                          </button>

                          <button
                            type="button"
                            className={`user-management-status-button ${
                              account.isActive ? "deactivate" : "activate"
                            }`}
                            disabled={isBusy || (isSelf && account.isActive)}
                            onClick={() => void handleStatusToggle(account)}
                          >
                            {account.isActive
                              ? text.deactivate
                              : text.activate}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

export default UserManagementPage;
