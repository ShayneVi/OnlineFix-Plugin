import Millennium, PluginUtils # type: ignore
logger = PluginUtils.Logger()

import json
import os
import zipfile
import shutil
import urllib.request
import tempfile
import sys
import subprocess

pos_db = {}

########
# UTIL #
########

def get_config_fname():
    return os.path.join(PLUGIN_BASE_DIR, "config.json")

def get_config():
    with open(get_config_fname(), "rt") as fp:
        return json.load(fp)

def get_appids_fname():
    return os.path.join(PLUGIN_BASE_DIR, "appIDs.txt")

def get_supported_appids():
    """Load the list of supported AppIDs from appIDs.txt"""
    appids_file = get_appids_fname()
    
    if not os.path.exists(appids_file):
        logger.log("appIDs.txt not found, button will show for all games")
        return None  # None means show for all games
    
    try:
        with open(appids_file, 'r') as f:
            # Read all lines, strip whitespace, ignore empty lines and comments
            appids = set()
            for line in f:
                line = line.strip()
                # Skip empty lines and comments (lines starting with #)
                if line and not line.startswith('#'):
                    try:
                        appids.add(int(line))
                    except ValueError:
                        logger.log(f"Invalid AppID in appIDs.txt: {line}")
            
            logger.log(f"Loaded {len(appids)} supported AppIDs from appIDs.txt")
            return appids
    except Exception as e:
        logger.log(f"Error reading appIDs.txt: {e}")
        return None

def is_appid_supported(app_id):
    """Check if an AppID is in the supported list"""
    supported_appids = get_supported_appids()
    
    # If appIDs.txt doesn't exist or is empty, support all games
    if supported_appids is None:
        return True
    
    # Check if the app_id is in the supported list
    is_supported = int(app_id) in supported_appids
    logger.log(f"is_appid_supported({app_id}) -> {is_supported}")
    return is_supported

def get_db_fname():
    return os.path.join(PLUGIN_BASE_DIR, "pos-db.json")

def load_pos_db():
    global pos_db
    if os.path.exists(get_db_fname()):
        with open(get_db_fname(), "rt") as fp:
            pos_db = json.load(fp)

def save_pos_db():
    global pos_db
    with open(get_db_fname(), "wt") as fp:
        json.dump(pos_db, fp)

###########
# DB UTIL #
###########

def get_x_pos(app_id):
    global pos_db
    app_id_str = str(app_id)
    if app_id_str in pos_db:
        return pos_db[app_id_str][0]
    return -1

def get_y_pos(app_id):
    global pos_db
    app_id_str = str(app_id)
    if app_id_str in pos_db:
        return pos_db[app_id_str][1]
    return -1

def set_xy_pos(app_id, pos_x, pos_y):
    global pos_db
    app_id_str = str(app_id)
    pos_db[app_id_str] = [pos_x, pos_y]
    save_pos_db()

#################
# NOTIFICATIONS #
#################

def show_notification(title, message, timeout=7):
    """Show a Windows notification using PowerShell"""
    try:
        # Escape quotes in the message
        title_escaped = title.replace('"', '`"').replace("'", "''")
        message_escaped = message.replace('"', '`"').replace("'", "''")
        
        # PowerShell script to show notification
        ps_script = f'''
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
$Template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)

$RawXml = [xml] $Template.GetXml()
($RawXml.toast.visual.binding.text|where {{$_.id -eq "1"}}).AppendChild($RawXml.CreateTextNode("{title_escaped}")) > $null
($RawXml.toast.visual.binding.text|where {{$_.id -eq "2"}}).AppendChild($RawXml.CreateTextNode("{message_escaped}")) > $null

$SerializedXml = New-Object Windows.Data.Xml.Dom.XmlDocument
$SerializedXml.LoadXml($RawXml.OuterXml)

$Toast = [Windows.UI.Notifications.ToastNotification]::new($SerializedXml)
$Toast.Tag = "OnlineFix"
$Toast.Group = "OnlineFix"
$Toast.ExpirationTime = [DateTimeOffset]::Now.AddSeconds({timeout})

$Notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Steam - OnlineFix")
$Notifier.Show($Toast);
'''
        
        # Run PowerShell command
        subprocess.Popen(
            ["powershell", "-WindowStyle", "Hidden", "-Command", ps_script],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
        )
        
        logger.log(f"Notification shown: {title} - {message}")
        return True
        
    except Exception as e:
        logger.log(f"Failed to show notification: {e}")
        # Fallback: just log it
        logger.log(f"NOTIFICATION: {title} - {message}")
        return False

#####################
# STEAM INTEGRATION #
#####################

def get_steam_path():
    """Get the Steam installation path"""
    # Try common Steam paths
    common_paths = [
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Steam"),
        os.path.expandvars(r"%PROGRAMFILES%\Steam"),
        os.path.expanduser("~/.steam/steam"),
        os.path.expanduser("~/.local/share/Steam"),
    ]
    
    for path in common_paths:
        if os.path.exists(path):
            return path
    
    return None

def get_library_folders():
    """Get all Steam library folders"""
    steam_path = get_steam_path()
    if not steam_path:
        return []
    
    library_folders_file = os.path.join(steam_path, "steamapps", "libraryfolders.vdf")
    
    if not os.path.exists(library_folders_file):
        return []
    
    folders = [os.path.join(steam_path, "steamapps")]
    
    try:
        with open(library_folders_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Parse VDF format - look for "path" entries
        lines = content.split('\n')
        for line in lines:
            if '"path"' in line:
                # Extract path from "path"		"C:\\SteamLibrary"
                parts = line.split('"')
                if len(parts) >= 4:
                    path = parts[3].replace('\\\\', '\\')
                    steamapps_path = os.path.join(path, "steamapps")
                    if os.path.exists(steamapps_path):
                        folders.append(steamapps_path)
    except Exception as e:
        logger.log(f"Error reading library folders: {e}")
    
    return folders

def get_game_install_path(app_id):
    """Get the installation path for a specific game"""
    library_folders = get_library_folders()
    
    for folder in library_folders:
        manifest_file = os.path.join(folder, f"appmanifest_{app_id}.acf")
        
        if os.path.exists(manifest_file):
            try:
                with open(manifest_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Parse installdir from manifest
                for line in content.split('\n'):
                    if '"installdir"' in line:
                        parts = line.split('"')
                        if len(parts) >= 4:
                            install_dir = parts[3]
                            game_path = os.path.join(folder, "common", install_dir)
                            if os.path.exists(game_path):
                                return game_path
            except Exception as e:
                logger.log(f"Error reading manifest: {e}")
    
    return None

def is_game_installed(app_id):
    """Check if a game is installed"""
    return get_game_install_path(app_id) is not None

################
# ONLINE FIX   #
################

def download_and_extract_fix(app_id, target_path):
    """Download the fix from GitHub and extract to target path"""
    try:
        # GitHub URL for the fix
        github_url = f"https://github.com/ShayneVi/OnlineFix/raw/main/{app_id}.zip"
        
        logger.log(f"Downloading fix from: {github_url}")
        show_notification("OnlineFix", f"Downloading fix for AppID {app_id}...", timeout=3)
        
        # Create temp directory for download
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, f"{app_id}.zip")
        
        # Download the zip file
        try:
            urllib.request.urlretrieve(github_url, zip_path)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                error_msg = f"Fix not found for AppID {app_id}"
                logger.log(f"ERROR: {error_msg}")
                show_notification("OnlineFix - Error", error_msg, timeout=5)
                return {"success": False, "error": error_msg}
            else:
                error_msg = f"Download failed: {e}"
                logger.log(f"ERROR: {error_msg}")
                show_notification("OnlineFix - Error", error_msg, timeout=5)
                return {"success": False, "error": error_msg}
        
        logger.log(f"Downloaded to: {zip_path}")
        
        # Extract zip file
        extract_path = os.path.join(temp_dir, "extracted")
        os.makedirs(extract_path, exist_ok=True)
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_path)
        
        logger.log(f"Extracted to: {extract_path}")
        
        # Find the appid folder inside extracted content
        appid_folder = os.path.join(extract_path, str(app_id))
        
        # If there's no appid subfolder, use the extract_path directly
        if not os.path.exists(appid_folder):
            appid_folder = extract_path
        
        # Copy all files from extracted folder to target path
        copied_files = 0
        for root, dirs, files in os.walk(appid_folder):
            # Get relative path from appid_folder
            rel_path = os.path.relpath(root, appid_folder)
            target_dir = os.path.join(target_path, rel_path) if rel_path != '.' else target_path
            
            # Create directories if needed
            os.makedirs(target_dir, exist_ok=True)
            
            # Copy files
            for file in files:
                src_file = os.path.join(root, file)
                dst_file = os.path.join(target_dir, file)
                
                shutil.copy2(src_file, dst_file)
                copied_files += 1
                logger.log(f"Copied: {file}")
        
        # Cleanup temp directory
        shutil.rmtree(temp_dir)
        
        success_msg = f"Successfully applied! {copied_files} files copied."
        logger.log(success_msg)
        show_notification("OnlineFix - Success!", success_msg, timeout=5)
        
        return {
            "success": True, 
            "files_copied": copied_files,
            "target_path": target_path
        }
        
    except Exception as e:
        error_msg = f"Error: {str(e)}"
        logger.log(f"Error in download_and_extract_fix: {e}")
        show_notification("OnlineFix - Error", error_msg, timeout=5)
        return {"success": False, "error": str(e)}

##############
# INTERFACES #
##############

class Backend:
    @staticmethod
    def get_app_x(app_id):
        pos_x = get_x_pos(app_id)
        logger.log(f"get_app_x({app_id}) -> {pos_x}")
        return pos_x

    @staticmethod
    def get_app_y(app_id):
        pos_y = get_y_pos(app_id)
        logger.log(f"get_app_y({app_id}) -> {pos_y}")
        return pos_y

    @staticmethod
    def set_app_xy(app_id, pos_x, pos_y):
        logger.log(f"set_app_xy({app_id}, {pos_x}, {pos_y})")
        set_xy_pos(app_id, pos_x, pos_y)
        return True

    @staticmethod
    def get_context_menu_enabled():
        context_menu_enabled = get_config()["context_menu"]
        logger.log(f"get_context_menu_enabled() -> {context_menu_enabled}")
        return context_menu_enabled

    @staticmethod
    def get_app_button_enabled():
        app_button_enabled = get_config()["show_button"]
        logger.log(f"get_app_button_enabled() -> {app_button_enabled}")
        return app_button_enabled
    
    @staticmethod
    def check_game_installed(app_id):
        """Check if game is installed"""
        installed = is_game_installed(app_id)
        logger.log(f"check_game_installed({app_id}) -> {installed}")
        if not installed:
            show_notification("OnlineFix - Error", "Game is not installed. Please install it first.", timeout=4)
        return installed
    
    @staticmethod
    def get_game_path(app_id):
        """Get the installation path for a game"""
        path = get_game_install_path(app_id)
        logger.log(f"get_game_path({app_id}) -> {path}")
        if not path:
            show_notification("OnlineFix - Error", "Could not find game installation path.", timeout=4)
        return path if path else ""
    
    @staticmethod
    def apply_online_fix(app_id, target_path):
        """Download and apply the online fix"""
        logger.log(f"apply_online_fix({app_id}, {target_path})")
        result = download_and_extract_fix(app_id, target_path)
        return result
    
    @staticmethod
    def is_appid_supported(app_id):
        """Check if this AppID should show the fix button"""
        return is_appid_supported(app_id)

class Plugin:
    def _front_end_loaded(self):
        logger.log("Frontend loaded")

    def _load(self):
        logger.log(f"Plugin base dir: {PLUGIN_BASE_DIR}")

        load_pos_db()
        logger.log("Database loaded")

        logger.log("Backend loaded")
        Millennium.ready()

    def _unload(self):
        save_pos_db()
        logger.log("Database saved")
        logger.log("Unloading")