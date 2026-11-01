const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#primary-navigation");
const navigationLinks = document.querySelectorAll(".nav-links a[href^='#']");
const pageSections = document.querySelectorAll("main section[id], main [data-nav-section]");
const header = document.querySelector(".site-header");
const currentYear = document.querySelector("#current-year");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

function closeNavigation() {
  if (!menuToggle || !navigation) {
    return;
  }

  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation menu");
  navigation.classList.remove("is-open");
}

if (menuToggle && navigation) {
  menuToggle.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isExpanded));
    menuToggle.setAttribute(
      "aria-label",
      isExpanded ? "Open navigation menu" : "Close navigation menu",
    );
    navigation.classList.toggle("is-open", !isExpanded);
  });

  navigationLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeNavigation();
      navigationLinks.forEach((navigationLink) => {
        navigationLink.removeAttribute("aria-current");
      });
      link.setAttribute("aria-current", "location");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNavigation();
      menuToggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
      closeNavigation();
    }
  });
}

if ("IntersectionObserver" in window) {
  if (!motionPreference.matches) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    document.querySelectorAll(".reveal").forEach((element) => {
      revealObserver.observe(element);
    });

    document.documentElement.classList.add("motion-ready");
  }

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        navigationLinks.forEach((link) => {
          if (link.hash === `#${entry.target.dataset.navSection || entry.target.id}`) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      });
    },
    { rootMargin: "-25% 0px -65% 0px" },
  );

  const navigableSections = Array.from(pageSections).filter((section) =>
    Array.from(navigationLinks).some(
      (link) => link.hash === `#${section.dataset.navSection || section.id}`,
    ),
  );

  navigableSections.forEach((section) => {
    sectionObserver.observe(section);
  });
}

if (header) {
  const updateHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

const scenePanel = document.querySelector("#scene-panel");
const sceneCanvas = document.querySelector("#hero-canvas");
const sceneStatus = document.querySelector("#scene-status");

if (scenePanel && sceneCanvas && sceneStatus) {
  const mobileViewport = window.matchMedia("(max-width: 760px)");
  let sceneInstance = null;
  let sceneVisible = false;
  let sceneRequested = false;

  function setSceneAvailability(message) {
    sceneStatus.textContent = message;
  }

  function updateSceneMode() {
    if (motionPreference.matches) {
      scenePanel.classList.remove("is-rendered");
      setSceneAvailability("Static preview · Reduced motion is enabled.");
      sceneInstance?.setActive(false);
      return;
    }

    if (mobileViewport.matches) {
      scenePanel.classList.remove("is-rendered");
      setSceneAvailability("Static preview · Optimized for mobile.");
      sceneInstance?.setActive(false);
      return;
    }

    if (sceneInstance) {
      scenePanel.classList.add("is-rendered");
      setSceneAvailability("Interactive field · Move your cursor.");
      sceneInstance.setActive(sceneVisible && document.visibilityState === "visible");
    } else if (sceneVisible && !sceneRequested) {
      void loadScene();
    } else if (!sceneRequested) {
      setSceneAvailability("A little structure in the chaos.");
    }
  }

  async function loadScene() {
    if (sceneRequested) {
      return;
    }

    sceneRequested = true;

    try {
      const { mountHeroScene } = await import("./hero-scene.js");
      sceneInstance = await mountHeroScene(sceneCanvas, {
        onReady() {
          if (!motionPreference.matches && !mobileViewport.matches) {
            scenePanel.classList.add("is-rendered");
            setSceneAvailability("Interactive field · Move your cursor.");
          }
        },
      });
      sceneInstance.setActive(
        sceneVisible &&
          document.visibilityState === "visible" &&
          !motionPreference.matches &&
          !mobileViewport.matches,
      );
      updateSceneMode();
    } catch (error) {
      console.error("The interactive 3D preview could not be loaded.", error);
      setSceneAvailability("Static preview · The interactive scene is unavailable.");
    }
  }

  function updateSceneVisibility(isVisible) {
    sceneVisible = isVisible;

    updateSceneMode();
  }

  if ("IntersectionObserver" in window) {
    const sceneObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          updateSceneVisibility(entry.isIntersecting);
        });
      },
      { threshold: 0.1 },
    );

    sceneObserver.observe(scenePanel);
  } else {
    sceneVisible = true;
    updateSceneMode();
  }

  document.addEventListener("visibilitychange", () => {
    updateSceneMode();
  });

  mobileViewport.addEventListener("change", updateSceneMode);
  motionPreference.addEventListener("change", updateSceneMode);
}
