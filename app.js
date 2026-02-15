"use strict";

const pageName = document.body?.dataset?.page;
if (pageName) {
  const navLinks = document.querySelectorAll("[data-nav]");
  navLinks.forEach((link) => {
    if (link.getAttribute("data-nav") === pageName) {
      link.classList.add("active");
    }
  });
}

const getFirebaseServices = () => {
  if (!window.firebaseReady || !window.firebaseServices) {
    return null;
  }
  return window.firebaseServices;
};

const LOCAL_USERS_KEY = "localTestUsers";

const readLocalUsers = () => {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const writeLocalUsers = (users) => {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

const localPasswordHash = (password) => {
  return btoa(unescape(encodeURIComponent(password)));
};

const createLocalUser = ({ firstName, lastName, phone, email, password }) => {
  return {
    id: `local-${Date.now()}`,
    firstName,
    lastName,
    phone,
    email,
    passwordHash: localPasswordHash(password),
    createdAt: new Date().toISOString()
  };
};

const toAuthMessage = (error, fallback) => {
  const code = error && error.code ? error.code : "";
  if (code === "auth/email-already-in-use") {
    return "That email is already in use.";
  }
  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }
  if (code === "auth/weak-password") {
    return "Password is too weak. Use at least 8 characters.";
  }
  if (
    code === "auth/user-not-found" ||
    code === "auth/wrong-password" ||
    code === "auth/invalid-credential"
  ) {
    return "Invalid email or password.";
  }
  return fallback;
};

const signupForm = document.querySelector("[data-signup-form]");
if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = document.querySelector("[data-signup-note]");
    const passwordField = signupForm.querySelector("#password");
    const confirmField = signupForm.querySelector("#confirmPassword");
    const firstNameField = signupForm.querySelector("#firstName");
    const lastNameField = signupForm.querySelector("#lastName");
    const phoneField = signupForm.querySelector("#phone");
    const emailField = signupForm.querySelector("#email");
    const submitButton = signupForm.querySelector("button[type='submit']");
    if (
      !note ||
      !passwordField ||
      !confirmField ||
      !firstNameField ||
      !lastNameField ||
      !phoneField ||
      !emailField
    ) {
      return;
    }

    note.classList.remove("form-error");
    note.textContent = "";

    if (passwordField.value !== confirmField.value) {
      note.textContent = "Passwords do not match.";
      note.classList.add("form-error");
      return;
    }

    if (passwordField.value.length < 8) {
      note.textContent = "Password must be at least 8 characters.";
      note.classList.add("form-error");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const services = getFirebaseServices();
      if (!services) {
        const firstName = firstNameField.value.trim();
        const lastName = lastNameField.value.trim();
        const phone = phoneField.value.trim();
        const email = emailField.value.trim().toLowerCase();
        const users = readLocalUsers();
        const existing = users.find((entry) => entry.email === email);
        if (existing) {
          note.textContent = "That email is already in use.";
          note.classList.add("form-error");
          return;
        }
        users.push(
          createLocalUser({
            firstName,
            lastName,
            phone,
            email,
            password: passwordField.value
          })
        );
        writeLocalUsers(users);
        note.textContent = "Account saved locally. Redirecting to sign in...";
        setTimeout(() => {
          window.location.href = "signin.html";
        }, 700);
        return;
      }

      const firstName = firstNameField.value.trim();
      const lastName = lastNameField.value.trim();
      const phone = phoneField.value.trim();
      const email = emailField.value.trim().toLowerCase();

      const credential = await services.auth.createUserWithEmailAndPassword(
        email,
        passwordField.value
      );

      if (credential.user) {
        await credential.user.updateProfile({
          displayName: `${firstName} ${lastName}`.trim()
        });
      }

      if (services.db && credential.user) {
        await services.db.collection("users").doc(credential.user.uid).set(
          {
            uid: credential.user.uid,
            firstName,
            lastName,
            phone,
            email,
            createdAt: new Date().toISOString()
          },
          { merge: true }
        );
      }

      note.textContent = "Account created. Redirecting to sign in...";
      setTimeout(() => {
        window.location.href = "signin.html";
      }, 700);
    } catch (error) {
      note.textContent = toAuthMessage(error, "Unable to create account.");
      note.classList.add("form-error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

const signinForm = document.querySelector("[data-signin-form]");
if (signinForm) {
  signinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const emailField = signinForm.querySelector("#signin-username");
    const passwordField = signinForm.querySelector("#signin-password");
    const note = document.querySelector("[data-signin-note]");
    const submitButton = signinForm.querySelector("button[type='submit']");
    if (!emailField || !passwordField || !note) {
      return;
    }

    note.classList.remove("form-error");
    note.textContent = "";

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const services = getFirebaseServices();
      if (!services) {
        const email = emailField.value.trim().toLowerCase();
        const users = readLocalUsers();
        const user = users.find((entry) => entry.email === email);
        if (!user || user.passwordHash !== localPasswordHash(passwordField.value)) {
          note.textContent = "Invalid email or password.";
          note.classList.add("form-error");
          return;
        }
        localStorage.setItem("currentUserEmail", user.email || "");
        localStorage.setItem(
          "currentUserName",
          `${user.firstName || ""} ${user.lastName || ""}`.trim()
        );
        const hasProfile = localStorage.getItem("hasProfile") === "true";
        window.location.href = hasProfile
          ? "dashboard.html"
          : "create-profile.html";
        return;
      }

      const credential = await services.auth.signInWithEmailAndPassword(
        emailField.value.trim().toLowerCase(),
        passwordField.value
      );

      if (credential.user) {
        localStorage.setItem("currentUserEmail", credential.user.email || "");
        localStorage.setItem(
          "currentUserName",
          credential.user.displayName || ""
        );
      }

      const hasProfile = localStorage.getItem("hasProfile") === "true";
      window.location.href = hasProfile ? "dashboard.html" : "create-profile.html";
    } catch (error) {
      note.textContent = toAuthMessage(error, "Unable to login.");
      note.classList.add("form-error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

const createProfileForm = document.querySelector("[data-create-profile-form]");
if (createProfileForm) {
  createProfileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const fileInput = createProfileForm.querySelector(
      "[data-profile-photo-input]"
    );
    const primaryInput = createProfileForm.querySelector("[data-primary-photo]");
    if (fileInput && primaryInput) {
      const files = fileInput.files ? Array.from(fileInput.files) : [];
      if (!files.length) {
        alert("Please add at least one photo.");
        return;
      }
      if (primaryInput.value === "") {
        primaryInput.value = "0";
      }
    }
    localStorage.setItem("hasProfile", "true");
    window.location.href = "dashboard.html";
  });
}

const locationField = document.querySelector("[data-location-field]");
if (locationField && "geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (locationField.value) {
        return;
      }
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const endpoint =
        "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" +
        encodeURIComponent(latitude) +
        "&lon=" +
        encodeURIComponent(longitude);

      fetch(endpoint)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Reverse geocoding failed");
          }
          return response.json();
        })
        .then((data) => {
          const address = data && data.address ? data.address : {};
          const city =
            address.city ||
            address.town ||
            address.village ||
            address.suburb ||
            address.county;
          if (city) {
            locationField.value = city;
            return;
          }
          locationField.value =
            data && data.display_name ? data.display_name : "Unknown location";
        })
        .catch(() => {
          const lat = latitude.toFixed(5);
          const lng = longitude.toFixed(5);
          locationField.value = `Lat ${lat}, Lng ${lng}`;
        });
    },
    () => {}
  );
}

const photoInput = document.querySelector("[data-profile-photo-input]");
const photoPreviews = document.querySelector("[data-photo-previews]");
const primaryPhoto = document.querySelector("[data-primary-photo]");
if (photoInput && photoPreviews && primaryPhoto) {
  const renderPreviews = (files) => {
    photoPreviews.innerHTML = "";
    files.forEach((file, index) => {
      const card = document.createElement("div");
      card.className = "photo-card";
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = `Photo ${index + 1}`;

      const label = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "primaryPhotoPick";
      radio.value = String(index);
      if (index === 0) {
        radio.checked = true;
        primaryPhoto.value = "0";
      }
      radio.addEventListener("change", () => {
        primaryPhoto.value = radio.value;
      });
      label.appendChild(radio);
      label.append(" Profile photo");

      card.appendChild(img);
      card.appendChild(label);
      photoPreviews.appendChild(card);
    });
  };

  photoInput.addEventListener("change", () => {
    const files = photoInput.files ? Array.from(photoInput.files) : [];
    if (files.length > 5) {
      alert("You can select up to 5 photos.");
      photoInput.value = "";
      photoPreviews.innerHTML = "";
      primaryPhoto.value = "";
      return;
    }
    if (!files.length) {
      photoPreviews.innerHTML = "";
      primaryPhoto.value = "";
      return;
    }
    renderPreviews(files);
  });
}
