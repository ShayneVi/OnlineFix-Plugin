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

                const sizerDiv = await WaitForElement(`div.${findModule(e => e.BoxSizer).BoxSizer}`, popup.m_popup.document);
                const savedX = await get_app_x({ app_id: appId });
                const savedY = await get_app_y({ app_id: appId });

                if (savedX !== -1 || savedY !== -1) {
                    sizerDiv.style.left = savedX + "px";
                    sizerDiv.style.top = savedY + "px";
                }

                const movementHandler = async () => {
                    if (!sizerDiv.classList.contains("logopos-header")) {
                        async function makeDraggableElement(elmnt) {
                            var diffX = 0, diffY = 0, lastX = 0, lastY = 0, elmntX = 0, elmntY = 0;
                            elmnt.onmousedown = dragMouseDown;
                            elmnt.style.cursor = "move";

                            async function dragMouseDown(e) {
                                e = e || window.event;
                                e.preventDefault();
                                lastX = e.clientX;
                                lastY = e.clientY;
                                popup.m_popup.document.onmouseup = elementRelease;
                                popup.m_popup.document.onmousemove = elementDrag;
                            }

                            async function elementDrag(e) {
                                e = e || window.event;
                                e.preventDefault();
                                diffX = lastX - e.clientX;
                                diffY = lastY - e.clientY;
                                lastX = e.clientX;
                                lastY = e.clientY;
                                elmntY = (elmnt.offsetTop - diffY);
                                elmntX = (elmnt.offsetLeft - diffX);
                                elmnt.style.top = elmntY + "px";
                                elmnt.style.left = elmntX + "px";
                            }

                            async function elementRelease() {
                                popup.m_popup.document.onmouseup = null;
                                popup.m_popup.document.onmousemove = null;
                                await set_app_xy({ app_id: appId, pos_x: elmntX, pos_y: elmntY });
                            }
                        }

                        makeDraggableElement(sizerDiv);
                        sizerDiv.classList.add("logopos-header");

                        const topCapsuleDiv = await WaitForElement(`div.${findModule(e => e.TopCapsule).TopCapsule}`, popup.m_popup.document);
                        const oldDoneBtn = topCapsuleDiv.querySelector("div.logo-move-done-button");
                        if (oldDoneBtn) {
                            oldDoneBtn.style.display = "";
                        } else {
                            const doneBtn = document.createElement('div');
                            doneBtn.className = "logo-move-done-button";
                            doneBtn.style.position = "absolute";
                            doneBtn.style.right = "20px";
                            doneBtn.style.bottom = "20px";
                            render(<DialogButton style={{width: "50px"}} onClick={movementHandler}>Done</DialogButton>, doneBtn);
                            topCapsuleDiv.appendChild(doneBtn);
                        }
                    } else {
                        sizerDiv.onmousedown = null;
                        sizerDiv.style.cursor = "";
                        sizerDiv.classList.remove("logopos-header");

                        const topCapsuleDiv = await WaitForElement(`div.${findModule(e => e.TopCapsule).TopCapsule}`, popup.m_popup.document);
                        const oldDoneBtn = topCapsuleDiv.querySelector("div.logo-move-done-button");
                        if (oldDoneBtn) {
                            oldDoneBtn.style.display = "none";
                        }
                    }
                };

                try {
                    const gameSettingsButton = await WaitForElement(`div.${findModule(e => e.InPage).InPage} div.${findModule(e => e.AppButtonsContainer).AppButtonsContainer} > div.${findModule(e => e.MenuButtonContainer).MenuButtonContainer}:not([role="button"])`, popup.m_popup.document);
                    
                    if (!gameSettingsButton || !gameSettingsButton.parentNode) {
                        console.log("[onlinefix] Could not find button container");
                        return;
                    }

                    // Remove old button if it exists
                    const oldButton = gameSettingsButton.parentNode.querySelector('div.online-fix-button');
                    if (oldButton) {
                        oldButton.remove();
                    }

                    const moveButton = gameSettingsButton.cloneNode(true);
                    moveButton.classList.add("online-fix-button");
                    moveButton.firstChild.innerHTML = "FIX";
                    moveButton.firstChild.style.color = "#D3D3D3";
                    moveButton.firstChild.style.fontWeight = "bold";
                    moveButton.firstChild.style.textShadow = "0 1px 2px rgba(0,0,0,0.3)";
                    moveButton.firstChild.style.background = "transparent";
                    moveButton.firstChild.style.padding = "0";
                    moveButton.firstChild.style.margin = "0 auto";
                    moveButton.firstChild.style.width = "100%";
                    moveButton.firstChild.style.textAlign = "center";
                    moveButton.style.background = "linear-gradient(135deg, #3a2a4a 0%, #4a3a5a 100%)";
                    moveButton.style.border = "1px solid #5a4a6a";
                    moveButton.style.borderRadius = "12px";
                    moveButton.style.padding = "8px 16px";
                    moveButton.style.minWidth = "70px";
                    moveButton.style.display = "flex";
                    moveButton.style.alignItems = "center";
                    moveButton.style.justifyContent = "center";
                    moveButton.style.transform = "scale(0.85)";
                    moveButton.style.marginRight = "8px";
                    moveButton.style.position = "relative";
                    moveButton.style.top = "-2px";
                    moveButton.addEventListener("mouseenter", () => {
                        moveButton.style.background = "linear-gradient(135deg, #4a3a5a 0%, #5a4a6a 100%)";
                    });
                    moveButton.addEventListener("mouseleave", () => {
                        moveButton.style.background = "linear-gradient(135deg, #3a2a4a 0%, #4a3a5a 100%)";
                    });
                    gameSettingsButton.parentNode.insertBefore(moveButton, gameSettingsButton);
                    
                    console.log("[onlinefix] FIX button added");

                    moveButton.addEventListener("click", async () => {
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
                        moveButton.firstChild.innerHTML = "...";
                        moveButton.style.pointerEvents = "none";

                        try {
                            const result = await apply_online_fix({ app_id: currentAppId, target_path: gamePath });
                            console.log("[onlinefix] Fix result:", result);
                        } catch (error) {
                            console.error("[onlinefix] Error:", error);
                        } finally {
                            moveButton.firstChild.innerHTML = "FIX";
                            moveButton.style.pointerEvents = "";
                        }
                    });

                } catch (error) {
                    console.error("[onlinefix] Error adding FIX button:", error);
                }

                const contextMenuEnabled = await get_context_menu_enabled({});
                if (contextMenuEnabled) {
                    if (observer) {
                        observer.disconnect();
                    }

                    const hasSpecificMenuItems = (container) => {
                        const itemsText = Array.from(container.querySelectorAll(`div.${findModule(e => e.ContextMenuMouseOverlay).contextMenuItem}.contextMenuItem`))
                            .map(el => el.textContent.trim());
                        while (!findModule(e => e["CustomArt_EditLogoPosition"]));
                        console.log("[onlinefix] CustomArt_EditLogoPosition == ", findModule(e => e["CustomArt_EditLogoPosition"])["CustomArt_EditLogoPosition"]);
                        const requiredItems = [findModule(e => e["CustomArt_EditLogoPosition"])["CustomArt_EditLogoPosition"]];
                        return requiredItems.every(item => itemsText.includes(item));
                    };

                    const addMoveLogoButton = (container) => {
                        if (!hasSpecificMenuItems(container)) return;
                        if (container.querySelector('.contextMenuItem.moveLogoAdded')) return;

                        const newItem = document.createElement('div');
                        newItem.setAttribute('role', `${findModule(e => e.ContextMenuMouseOverlay).contextMenuItem}`);
                        newItem.className = `${findModule(e => e.ContextMenuMouseOverlay).contextMenuItem} contextMenuItem moveLogoAdded`;
                        newItem.textContent = 'Move Logo';
                        newItem.addEventListener('click', async () => {
                            await movementHandler();
                            const parentDiv = container.parentElement;
                            if (parentDiv) parentDiv.style.display = 'none';
                            else container.style.display = 'none';
                        });
                        container.appendChild(newItem);
                        console.log('[onlinefix] "Move Logo" item successfully added');
                    };

                    observer = new MutationObserver(mutations => {
                        mutations.forEach(mutation => {
                            mutation.addedNodes.forEach(node => {
                                if (node.nodeType === 1) {
                                    const container = node.querySelector(`div.${findModule(e => e.ContextMenuMouseOverlay).contextMenuContents}`) ||
                                        (node.classList && node.classList.contains(`${findModule(e => e.ContextMenuMouseOverlay).contextMenuContents}`) ? node : null);
                                    if (container) {
                                        addMoveLogoButton(container);
                                    }
                                }
                            });
                        });
                    });

                    observer.observe(popup.m_popup.document.body, { childList: true, subtree: true });
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