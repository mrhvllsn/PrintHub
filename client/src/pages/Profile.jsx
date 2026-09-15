import {
  useEffect,
  useState,
} from "react";

import { Camera } from "lucide-react";

import {
  api,
  dt,
} from "../lib/api";

import {
  Loading,
  PageTitle,
} from "../components/UI";

import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { setUser } = useAuth();

  const [form, setForm] = useState();
  const [selectedFile, setSelectedFile] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("");

  /* =======================================================
     LOAD PROFILE
  ======================================================= */

  useEffect(() => {
    api("/profile")
      .then(setForm)
      .catch((error) => {
        setMessage(error.message);
        setMessageType("error");
      });
  }, []);

  /* =======================================================
     CREATE AND CLEAN IMAGE PREVIEW
  ======================================================= */

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return undefined;
    }

    const temporaryUrl =
      URL.createObjectURL(selectedFile);

    setPreviewUrl(temporaryUrl);

    return () => {
      URL.revokeObjectURL(temporaryUrl);
    };
  }, [selectedFile]);

  if (!form) {
    return <Loading />;
  }

  const savedProfilePicture =
    form.profile_picture
      ? `/api/avatars/${form.profile_picture}`
      : null;

  const displayedPicture =
    previewUrl || savedProfilePicture;

  /* =======================================================
     UPDATE FORM FIELDS
  ======================================================= */

  function updateField(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  /* =======================================================
     VALIDATE PROFILE PICTURE
  ======================================================= */

  function selectProfilePicture(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    const maximumSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setMessage(
        "Please select a JPG, JPEG, PNG, or WebP image.",
      );

      setMessageType("error");
      event.target.value = "";

      return;
    }

    if (file.size > maximumSize) {
      setMessage(
        "The profile picture must not be larger than 5 MB.",
      );

      setMessageType("error");
      event.target.value = "";

      return;
    }

    setSelectedFile(file);
    setMessage("");
    setMessageType("");
  }

  /* =======================================================
     SAVE PROFILE
  ======================================================= */

  async function saveProfile(event) {
    event.preventDefault();

    setBusy(true);
    setMessage("");
    setMessageType("");

    try {
      const formData = new FormData();

      if (selectedFile) {
        formData.append(
          "avatar",
          selectedFile,
        );
      }

      formData.append(
        "data",
        JSON.stringify(form),
      );

      await api("/profile", {
        method: "PATCH",
        body: formData,
      });

      const updatedProfile =
        await api("/profile");

      setForm(updatedProfile);
      setSelectedFile(null);

      const savedUser = JSON.parse(
        localStorage.getItem("user") || "{}",
      );

      const updatedUser = {
        ...savedUser,
        ...updatedProfile,
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser),
      );

      setUser(updatedUser);

      setMessage(
        "Your profile and picture were saved successfully.",
      );

      setMessageType("success");
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  }

  const profileFields = [
    {
      label: "Full name",
      name: "full_name",
      type: "text",
      required: true,
    },
    {
      label: "Username",
      name: "username",
      type: "text",
      required: true,
    },
    {
      label: "Email address",
      name: "email",
      type: "email",
      required: true,
    },
    {
      label: "Phone number",
      name: "phone",
      type: "tel",
      required: false,
    },
    {
      label: "Address",
      name: "address",
      type: "text",
      required: false,
      fullWidth: true,
    },
  ];

  return (
    <>
      <PageTitle
        title="Profile Settings"
        subtitle="Update your personal details and profile picture."
      />

      <form
        onSubmit={saveProfile}
        className="card mx-auto max-w-3xl"
      >
        {message && (
          <p
            className={`
              mb-5 rounded-xl p-3 text-sm
              ${
                messageType === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }
            `}
          >
            {message}
          </p>
        )}

        {/* Profile picture and account information */}
        <div
          className="
            mb-6 flex flex-col
            items-start gap-5
            sm:flex-row sm:items-center
          "
        >
          <label
            className="
              relative !mb-0
              cursor-pointer
            "
          >
            <div
              className="
                grid h-24 w-24
                place-items-center
                overflow-hidden rounded-full
                bg-cyan text-3xl
                font-black text-navy
              "
            >
              {displayedPicture ? (
                <img
                  className="h-full w-full object-cover"
                  src={displayedPicture}
                  alt={`${form.full_name}'s profile`}
                />
              ) : (
                form.full_name?.[0]?.toUpperCase() ||
                "U"
              )}
            </div>

            <span
              className="
                absolute bottom-0 right-0
                rounded-full bg-brand
                p-2 text-white
                shadow-md
              "
            >
              <Camera size={16} />
            </span>

            <input
              className="hidden"
              type="file"
              accept=".jpg,.jpeg,.jfif,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={selectProfilePicture}
            />
          </label>

          <div>
            <h2 className="text-xl font-bold">
              {form.full_name}
            </h2>

            <p className="capitalize text-slate-500">
              {form.role} account
            </p>

            <p className="text-xs text-slate-400">
              Created {dt(form.created_at)}
            </p>

            <p className="mt-2 text-xs text-brand">
              Click the picture to choose a new
              photo.
            </p>

            {selectedFile && (
              <p className="mt-1 text-xs text-green-600">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>
        </div>

        {/* Profile information fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          {profileFields.map((field) => (
            <div
              key={field.name}
              className={
                field.fullWidth
                  ? "sm:col-span-2"
                  : ""
              }
            >
              <label htmlFor={field.name}>
                {field.label}
              </label>

              <input
                id={field.name}
                name={field.name}
                type={field.type}
                value={form[field.name] || ""}
                onChange={updateField}
                required={field.required}
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="btn-primary mt-6"
        >
          {busy
            ? "Saving..."
            : "Save Changes"}
        </button>
      </form>
    </>
  );
}