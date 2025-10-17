import { callable, findModule, Millennium, sleep, DialogButton } from "@steambrew/client";
import { render } from "react-dom";

// Backend functions
const get_app_x = callable<[{ app_id: number }], number>('Backend.get_app_x');
const get_app_y = callable<[{ app_id: number }], number>('Backend.get_app_y');
const set_app_xy = callable<[{ app_id: number, pos_x: number, pos_y: number }], boolean>('Backend.set_app_xy');
const get_context_menu_enabled = callable<[{}], boolean>('Backend.get_context_menu_enabled');
const get_app_button_enabled = callable<[{}], boolean>('Backend.get_app_button_enabled');
const check_game_installed = callable<[{ app_id: number }], boolean>('Backend.check_game_installed');
const get_game_path = callable<[{ app_id: number }], string>('Backend.get_game_path');
const apply_online_fix = callable<[{ app_id: number, target_path: string }], any>('Backend.apply_online_fix');
const is_appid_supported = callable<[{ app_id: number }], boolean>('Backend.is_appid_supported');

const WaitForElement = async (sel: string, parent = document) =>
    [...(await Millennium.findElement(parent, sel))][0];

const WaitForElementTimeout = async (sel: string, parent = document, timeOut = 1000) =>
    [...(await Millennium.findElement(parent, sel, timeOut))][0];

const WaitForElementList = async (sel: string, parent = document) =>
    [...(await Millennium.findElement(parent, sel))];

async function OnPopupCreation(popup) {
    if (popup.m_strName === "SP Desktop_uid0") {
        
        let observer = null;

        var mwbm = undefined;
        while (!mwbm) {
            console.log("[onlinefix] Waiting for MainWindowBrowserManager");
            try {
                mwbm = MainWindowBrowserManager;
            } catch {
                await sleep(100);
            }
        }

        MainWindowBrowserManager.m_browser.on("finished-request", async (currentURL, previousURL) => {
            if (MainWindowBrowserManager.m_lastLocation.pathname.startsWith("/library/app/")) {
                const appId = uiStore.currentGameListSelection.nAppId;
                
                // Check if button is enabled globally
                const appButtonEnabled = await get_app_button_enabled({});
                if (!appButtonEnabled) {
                    console.log("[onlinefix] Button globally disabled in config");
                    return;
                }

                // Check if this specific AppID is supported
                const isSupported = await is_appid_supported({ app_id: appId });
                if (!isSupported) {
                    console.log(`[onlinefix] AppID ${appId} is not in the supported list`);
                    return;
                }

                console.log(`[onlinefix] AppID ${appId} is supported, adding button`);

                // Wait a bit for the page to fully render
                await sleep(500);

                try {
                    // Find the game action area that contains the settings gear icon
                    // Look for the container that has the PLAY button and other controls
                    const doc = popup.m_popup.document;
                    
                    // Method 1: Find by looking for elements near the settings/info icons
                    let buttonContainer = null;
                    
                    // Look for the div that contains the settings gear and info icons
                    // These are typically SVG icons in a flex container
                    const allDivs = doc.querySelectorAll('div');
                    
                    for (const div of allDivs) {
                        // Look for containers with multiple SVG children (gear, info, etc.)
                        const svgs = div.querySelectorAll('svg');
                        if (svgs.length >= 2) {
                            // Check if this is in the right vertical position (near the PLAY button area)
                            const rect = div.getBoundingClientRect();
                            // The settings area is usually around 450-550px from top
                            if (rect.top > 400 && rect.top < 600) {
                                // Additional check: should be on the right side
                                if (rect.right > 1000) {
                                    // Check if it's a flex container
                                    const styles = window.getComputedStyle(div);
                                    if (styles.display === 'flex' || div.children.length >= 2) {
                                        buttonContainer = div;
                                        console.log("[onlinefix] Found button container near gear icon at:", rect);
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // Fallback: Look for any horizontal flex container with multiple button-like children
                    if (!buttonContainer) {
                        console.log("[onlinefix] Using fallback method to find button container");
                        for (const div of allDivs) {
                            const rect = div.getBoundingClientRect();
                            // Check vertical position and reasonable width
                            if (rect.top > 400 && rect.top < 600 && rect.width > 100) {
                                // Check if it has multiple children that look like buttons
                                if (div.children.length >= 2) {
                                    // Check if children are button-sized
                                    let hasButtonSizedChildren = false;
                                    for (const child of div.children) {
                                        const childRect = child.getBoundingClientRect();
                                        if (childRect.width > 30 && childRect.width < 80 && 
                                            childRect.height > 30 && childRect.height < 80) {
                                            hasButtonSizedChildren = true;
                                            break;
                                        }
                                    }
                                    if (hasButtonSizedChildren) {
                                        buttonContainer = div;
                                        console.log("[onlinefix] Found button container (fallback) at:", rect);
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (!buttonContainer) {
                        console.error("[onlinefix] Could not find button container!");
                        return;
                    }

                    // Remove old button if exists
                    const oldButton = buttonContainer.querySelector('.online-fix-button');
                    if (oldButton) {
                        oldButton.remove();
                    }

                    // Create the FIX button
                    const fixButton = doc.createElement('div');
                    fixButton.className = 'online-fix-button';
                    
                    // Style it to match Steam's button style
                    fixButton.style.cssText = `
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        background: linear-gradient(135deg, #3a2a4a 0%, #4a3a5a 100%);
                        border: 1px solid #5a4a6a;
                        border-radius: 3px;
                        padding: 8px 12px;
                        margin: 0 6px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-size: 13px;
                        font-weight: 600;
                        color: #D3D3D3;
                        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                        min-width: 45px;
                        height: 40px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        user-select: none;
                        flex-shrink: 0;
                    `;
                    
                    fixButton.textContent = 'FIX';

                    // Hover effects
                    fixButton.addEventListener('mouseenter', () => {
                        fixButton.style.background = 'linear-gradient(135deg, #4a3a5a 0%, #5a4a6a 100%)';
                        fixButton.style.transform = 'translateY(-1px)';
                        fixButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                    });

                    fixButton.addEventListener('mouseleave', () => {
                        fixButton.style.background = 'linear-gradient(135deg, #3a2a4a 0%, #4a3a5a 100%)';
                        fixButton.style.transform = 'translateY(0)';
                        fixButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                    });

                    // Click handler - apply the fix
                    fixButton.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const currentAppId = uiStore.currentGameListSelection.nAppId;
                        console.log("[onlinefix] Fix button clicked for app:", currentAppId);

                        const isInstalled = await check_game_installed({ app_id: currentAppId });
                        if (!isInstalled) {
                            console.log("[onlinefix] Game not installed");
                            return;
                        }

                        const gamePath = await get_game_path({ app_id: currentAppId });
                        if (!gamePath) {
                            console.log("[onlinefix] Could not find game path");
                            return;
                        }

                        console.log("[onlinefix] Starting fix download...");
                        fixButton.textContent = "...";
                        fixButton.style.pointerEvents = "none";
                        fixButton.style.opacity = "0.6";

                        try {
                            const result = await apply_online_fix({ app_id: currentAppId, target_path: gamePath });
                            console.log("[onlinefix] Fix result:", result);
                        } catch (error) {
                            console.error("[onlinefix] Error:", error);
                        } finally {
                            fixButton.textContent = "FIX";
                            fixButton.style.pointerEvents = "";
                            fixButton.style.opacity = "1";
                        }
                    });

                    // Insert the button at the beginning of the container
                    // This will place it before the settings/gear icon
                    if (buttonContainer.firstChild) {
                        buttonContainer.insertBefore(fixButton, buttonContainer.firstChild);
                    } else {
                        buttonContainer.appendChild(fixButton);
                    }

                    console.log("[onlinefix] FIX button added successfully!");

                } catch (error) {
                    console.error("[onlinefix] Error adding FIX button:", error);
                }
            }
        });
    }
}

export default async function PluginMain() {
    console.log("[onlinefix] Frontend startup");
    await App.WaitForServicesInitialized();

    while (
        typeof g_PopupManager === 'undefined' ||
        typeof MainWindowBrowserManager === 'undefined'
    ) {
        await sleep(100);
    }

    const doc = g_PopupManager.GetExistingPopup("SP Desktop_uid0");
    if (doc) {
        OnPopupCreation(doc);
    }

    g_PopupCreatedCallback(OnPopupCreation);
}