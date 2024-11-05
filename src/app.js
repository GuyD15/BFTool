document.addEventListener("DOMContentLoaded", async () => {
    const themeToggle = document.getElementById("themeToggle");
    const loginContainer = document.getElementById("loginContainer");
    const loginForm = document.getElementById("loginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const adminLoginButton = document.getElementById("adminLoginButton");
    const logoutButton = document.getElementById("logoutButton");
    const createPageButton = document.getElementById("createPageButton");
    const createSubpageButton = document.getElementById("createSubpageButton");
    const editButton = document.getElementById("editButton");
    const deleteButton = document.getElementById("deleteButton");
    const pagesList = document.getElementById("pagesList");
    const pageTitle = document.getElementById("pageTitle");
    const pageContent = document.getElementById("pageContent");
    const addPageForm = document.getElementById("addPageForm");
    const addPageFormContainer = document.getElementById("addPageFormContainer");
    const formTitle = document.getElementById("formTitle");
    const cancelAddPage = document.getElementById("cancelAddPage");
    const cancelLogin = document.getElementById("cancelLogin");
    const searchInput = document.getElementById("searchInput");

    let isAdmin = false;
    let currentPageId = null;
    let isEditing = false;
    let expandedPageId = null;
    let pagesData = [];

    function checkAdminStatus() {
        const token = localStorage.getItem('adminToken');
        if (token) {
            isAdmin = true;
            applyAdminPermissions();
            adminLoginButton.style.display = "none";
            logoutButton.style.display = "inline";
        } else {
            isAdmin = false;
            applyAdminPermissions();
        }
    }

    themeToggle.addEventListener("change", () => {
        document.body.classList.toggle("dark-mode");
        localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
    });

    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        themeToggle.checked = true;
    }

    adminLoginButton.addEventListener("click", () => {
        loginContainer.style.display = "block";
    });

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const username = usernameInput.value;
        const password = passwordInput.value;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) throw new Error('Invalid credentials');
            const data = await response.json();

            localStorage.setItem('adminToken', data.token);
            isAdmin = true;
            loginContainer.style.display = "none";
            adminLoginButton.style.display = "none";
            logoutButton.style.display = "inline";
            applyAdminPermissions();
            loadPages();
            showToast("Login successful");
        } catch (error) {
            alert(error.message);
        }
    });

    logoutButton.addEventListener("click", () => {
        localStorage.removeItem('adminToken');
        isAdmin = false;
        applyAdminPermissions();
        logoutButton.style.display = "none";
        adminLoginButton.style.display = "inline";
        showToast("Logged out successfully");
    });

    function applyAdminPermissions() {
        createPageButton.style.display = isAdmin ? "inline" : "none";
        createSubpageButton.style.display = isAdmin ? "inline" : "none";
        editButton.style.display = isAdmin ? "inline" : "none";
        deleteButton.style.display = isAdmin ? "inline" : "none";
    }

    async function loadPages() {
        try {
            const response = await fetch("/pages");
            const data = await response.json();
            console.log("Loaded pages data:", JSON.stringify(data, null, 2)); // Detailed logging for structure inspection
            pagesData = data;
            displayPages(pagesData);
        } catch (error) {
            console.error("Error loading pages:", error);
        }
    }

    function displayPages(pages) {
        pagesList.innerHTML = "";
        pages.forEach(page => {
            const mainPageItem = document.createElement("div");
            mainPageItem.textContent = page.title;
            mainPageItem.classList.add("main-page");

            // Check if the page is currently expanded
            if (page.id === expandedPageId) {
                mainPageItem.classList.add("expanded");
            }

            mainPageItem.onclick = () => toggleSubpages(page);

            pagesList.appendChild(mainPageItem);

            // Display subpages if this main page is currently expanded
            if (page.id === expandedPageId && page.subpages && page.subpages.length > 0) {
                const chapterContainer = document.createElement("div");
                chapterContainer.classList.add("chapter-container");

                page.subpages.forEach(subpage => {
                    const subpageItem = document.createElement("div");
                    subpageItem.textContent = subpage.title;
                    subpageItem.classList.add("subpage");
                    subpageItem.onclick = (e) => {
                        e.stopPropagation();
                        displayContent(subpage, true);
                    };
                    chapterContainer.appendChild(subpageItem);
                });

                pagesList.appendChild(chapterContainer);
            }
        });
    }

    function toggleSubpages(page) {
        expandedPageId = expandedPageId === page.id ? null : page.id;
        displayPages(pagesData); // Re-render pages to update the expanded/collapsed state
    }

    function displayContent(page, isSubpage) {
        pageTitle.textContent = page.title;
        pageContent.textContent = page.content;
        currentPageId = page.id;

        if (isAdmin) {
            createSubpageButton.style.display = !isSubpage ? "inline" : "none";
            editButton.style.display = "inline";
            deleteButton.style.display = "inline";
            deleteButton.onclick = () => deletePage(page.id, isSubpage);
        } else {
            createSubpageButton.style.display = "none";
            editButton.style.display = "none";
            deleteButton.style.display = "none";
        }
    }

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();
        if (query) {
            const filteredPages = filterPages(pagesData, query);
            displayPages(filteredPages);
        } else {
            displayPages(pagesData);
        }
    });

    function filterPages(pages, query) {
        const threshold = 3;

        return pages.reduce((acc, page) => {
            const pageTitle = page.title.toLowerCase();
            const pageContent = page.content.toLowerCase();
            const titleMatch = levenshtein(query, pageTitle) <= threshold;
            const contentMatch = pageContent.includes(query);

            let subpages = [];
            if (page.subpages) {
                subpages = filterPages(page.subpages, query);
            }

            if (titleMatch || contentMatch || subpages.length > 0) {
                acc.push({ ...page, subpages });
            }

            return acc;
        }, []);
    }

    function levenshtein(a, b) {
        const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
            Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
        );

        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                matrix[i][j] = a[i - 1] === b[j - 1]
                    ? matrix[i - 1][j - 1]
                    : Math.min(
                          matrix[i - 1][j] + 1,
                          matrix[i][j - 1] + 1,
                          matrix[i - 1][j - 1] + 1
                      );
            }
        }

        return matrix[a.length][b.length];
    }

    createPageButton.addEventListener("click", () => {
        isEditing = false;
        formTitle.textContent = "Add a New Page";
        addPageFormContainer.style.display = "block";
    });

    createSubpageButton.addEventListener("click", () => {
        isEditing = false;
        formTitle.textContent = "Add a New Subpage";
        addPageFormContainer.style.display = "block";
    });

    editButton.addEventListener("click", () => {
        isEditing = true;
        formTitle.textContent = "Edit Page";
        document.getElementById("title").value = pageTitle.textContent;
        document.getElementById("content").value = pageContent.textContent;
        addPageFormContainer.style.display = "block";
    });

    addPageForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const title = document.getElementById("title").value;
        const content = document.getElementById("content").value;

        const token = localStorage.getItem('adminToken');
        const endpoint = isEditing ? `/pages/${currentPageId}` : "/pages";
        const method = isEditing ? "PUT" : "POST";
        const parentId = isEditing ? null : currentPageId;

        try {
            const response = await fetch(endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ title, content, parent_id: parentId })
            });

            if (!response.ok) throw new Error("Failed to save the page");
            addPageFormContainer.style.display = "none";
            loadPages();
            showToast("Page saved successfully");
        } catch (error) {
            console.error("Error saving page:", error);
            showToast("An error occurred while saving the page");
        }
    });

    cancelAddPage.addEventListener("click", () => {
        addPageFormContainer.style.display = "none";
    });

    cancelLogin.addEventListener("click", () => {
        loginContainer.style.display = "none";
    });

    function showToast(message) {
        const toast = document.createElement("div");
        toast.classList.add("toast-message");
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    checkAdminStatus();
    loadPages();
});
