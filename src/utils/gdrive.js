/**
 * Google Drive REST API integration utility.
 * Operates purely client-side using OAuth2 implicit grant flow.
 * Uses the 'drive.appdata' scope, meaning the app can only read and write
 * to its own hidden sandboxed folder inside the user's Google Drive.
 */

// Default client ID. Users can also configure their own under settings.
export const DEFAULT_CLIENT_ID = "1086747680952-c7im0b4i966bg2ooa4rsub6ve58tofcc.apps.googleusercontent.com"; // Placeholder - user can change

/**
 * Initiates the Google OAuth2 login flow.
 * Redirects the browser to Google's authentication page.
 */
export const initiateOAuthFlow = (clientId = DEFAULT_CLIENT_ID) => {
  const redirectUri = `${window.location.origin}/`;
  const scope = "https://www.googleapis.com/auth/drive.appdata";
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=consent`;
  
  window.location.href = authUrl;
};

/**
 * Parses the access token from the URL hash fragment if present.
 * Should be run on application mount.
 */
export const handleOAuthCallback = () => {
  const hash = window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash.substring(1)); // strip leading '#'
  const accessToken = params.get("access_token");
  const expiresIn = params.get("expires_in");

  if (accessToken) {
    // Clear hash fragment from URL
    window.history.replaceState(null, null, window.location.pathname + window.location.search);
    
    const expiryTime = Date.now() + parseInt(expiresIn, 10) * 1000;
    return { accessToken, expiryTime };
  }
  return null;
};

/**
 * Searches for the backup file in the Google Drive appDataFolder.
 * Returns the file metadata (including file ID) if found, otherwise null.
 */
const findBackupFile = async (token) => {
  const url = "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='WealthWise_Backup.json'&fields=files(id,name)";
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error(`Google API returned status ${res.status}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }
  return null;
};

/**
 * Uploads a JSON backup of local data to Google Drive.
 */
export const uploadBackup = async (token, dataPayload) => {
  const fileContent = typeof dataPayload === "string" ? dataPayload : JSON.stringify(dataPayload, null, 2);
  
  try {
    const existingFile = await findBackupFile(token);
    let url = "";
    let method = "";
    
    if (existingFile) {
      // Overwrite existing file
      url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
      method = "PATCH";
    } else {
      // Create new file metadata first
      const createMetaUrl = "https://www.googleapis.com/drive/v3/files";
      const metadata = {
        name: "WealthWise_Backup.json",
        parents: ["appDataFolder"]
      };

      const metaRes = await fetch(createMetaUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(metadata)
      });

      if (!metaRes.ok) {
        throw new Error("Failed to create backup file metadata");
      }

      const metaData = await metaRes.json();
      url = `https://www.googleapis.com/upload/drive/v3/files/${metaData.id}?uploadType=media`;
      method = "PATCH"; // PATCH to upload file contents
    }

    // Upload media bytes
    const uploadRes = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: fileContent
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed with status: ${uploadRes.status}`);
    }

    return true;
  } catch (err) {
    console.error("Google Drive Upload Error:", err);
    throw err;
  }
};

/**
 * Downloads the JSON backup from Google Drive and returns the parsed data.
 */
export const downloadBackup = async (token) => {
  try {
    const existingFile = await findBackupFile(token);
    if (!existingFile) {
      return null;
    }

    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`Download failed with status: ${res.status}`);
    }

    const backupData = await res.json();
    return backupData;
  } catch (err) {
    console.error("Google Drive Download Error:", err);
    throw err;
  }
};
