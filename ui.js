$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navContent = $(".main-nav-links");
  const $navSubmit = $("#nav-submit");
  const $navFavorites = $("#nav-favorites");
  const $navAll = $("#nav-all");
  const $navStories = $("#nav-stories");
  const $myArticles = $("#my-articles");
  const $favoritedArticles = $("#favorited-articles");
  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-password").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    let userInstance;
    try {
      userInstance = await User.login(username, password);
    } catch (err) {
      alert("Incorrect Username or Password");
    }
    // console.log(userInstance);
    // set the global user to the user instance

    currentUser = userInstance;

    console.log(currentUser);
    const pinNameToLogout = $("a > small");
    pinNameToLogout.text(`${currentUser.name}(logout)`);
    const pinNameToUserInfo = $("#profile-name");
    pinNameToUserInfo.text(`Name: ${currentUser.name}`);
    const pinUsernameToUserInfo = $("#profile-username");
    pinUsernameToUserInfo.text(`Username: ${currentUser.username}`);
    const pinAccountCreationToUserInfo = $("#profile-account-date");
    pinAccountCreationToUserInfo.text(
      `Account Created: ${currentUser.createdAt.slice(0, 10)}`
    );
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
    // activateStarClicks();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    let newUser;
    try {
      newUser = await User.create(username, password, name);
    } catch (err) {
      alert("Username already taken, try a different one");
      return;
    }

    currentUser = newUser;
    const pinNameToLogout = $("a > small");
    pinNameToLogout.text(`${currentUser.name}(logout)`);
    const pinNameToUserInfo = $("#profile-name");
    pinNameToUserInfo.text(`Name: ${currentUser.name}`);
    const pinUsernameToUserInfo = $("#profile-username");
    pinUsernameToUserInfo.text(`Username: ${currentUser.username}`);
    const pinAccountCreationToUserInfo = $("#profile-account-date");
    pinAccountCreationToUserInfo.text(
      `Account Created: ${currentUser.createdAt.slice(0, 10)}`
    );
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /*
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  $navSubmit.on("click", function () {
    // Show the Login and Create Account Forms
    if (currentUser) {
      $allStoriesList.show();
      $submitForm.slideToggle();
      // loadFavoritedStars();
    }
  });

  $submitForm.on("submit", async function (evt) {
    evt.preventDefault();
    let formValues = {};
    const getAuthor = $("#author");
    const getTitle = $("#title");
    const getUrl = $("#url");
    formValues.author = getAuthor.val();
    formValues.title = getTitle.val();
    formValues.url = getUrl.val();
    await storyList.addStory(currentUser, formValues);
    getAuthor.val("");
    getTitle.val("");
    getUrl.val("");
    generateStories();
    $submitForm.slideToggle();
  });

  $navAll.on("click", function (evt) {
    evt.preventDefault();
    loadFavoritedStars();
    $myArticles.hide();
    $favoritedArticles.hide();
    $allStoriesList.show();
  });

  $navFavorites.on("click", async function (evt) {
    // const token = localStorage.getItem("token");
    // const username = localStorage.getItem("username");

    // let updatedCurrentUser = await User.getLoggedInUser(token, username);

    if (
      currentUser.favorites.length === 0 &&
      $favoritedArticles.children().length === 0
    ) {
      $favoritedArticles.append(
        "<h5>No favorites have been added by user yet!</h5>"
      );
    } else if ($favoritedArticles.children().length > 1) {
      $favoritedArticles.children("h5").text("");
    }
    $favoritedArticles.show();
    evt.preventDefault();
    $myArticles.hide();
    $allStoriesList.hide();
  });

  $navStories.on("click", function (evt) {
    evt.preventDefault();
    $myArticles.show();
    $allStoriesList.hide();
    $favoritedArticles.hide();
    document.getElementById("my-articles").classList.remove("hidden");
    loadMyStories();
  });

  $(".articles-container").on("click", ".fa-star", async function (evt) {
    if (currentUser) {
      const $tgt = $(evt.target);
      const $closestLi = $tgt.closest("li");
      const storyId = $closestLi.attr("id");

      // console.log($tgt);
      // if the item is already favorited
      if ($tgt.hasClass("fas")) {
        // remove the favorite from the user's list
        const response = await storyList.toggleFavorite(
          storyId,
          "Delete",
          currentUser
        );

        // then change the class to be an empty star
        $tgt.closest("i").toggleClass("fas far");
        deleteFavorites(response, storyId);
      } else {
        // the item is un-favorited
        const response = await storyList.toggleFavorite(
          storyId,
          "Post",
          currentUser
        );

        addFavorites(response, storyId);

        $tgt.closest("i").toggleClass("fas far");
      }
    }
  });

  $(".articles-container").on("click", ".fa-trash", async function (evt) {
    if (currentUser) {
      const $tgt = $(evt.target);
      const $closestLi = $tgt.closest("li");
      const storyId = $closestLi.attr("id");

      // if the item is already favorited

      // remove the favorite from the user's list
      const response = await storyList.deleteStory(
        storyId,
        "Delete",
        currentUser
      );

      hideElements();
      generateStories();
      deleteFavorites(response, storyId);
      $allStoriesList.show();
      // console.log(response);
    }
  });
  async function loadMyStories() {
    $myArticles.empty();
    // // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // // if there is a token in localStorage, call User.getLoggedInUser
    // //  to get an instance of User with the right details
    // //  this is designed to run once, on page load
    // if (token === null) return;
    currentUser = await User.getLoggedInUser(token, username);
    const myStories = currentUser.ownStories;
    const myFavoritedStories = currentUser.favorites;
    if (myStories.length == 0) {
      $myArticles.append("<h5> No stories added by user yet! </h5>");
    }

    for (let i = 0; i < myStories.length; i++) {
      let ownStoryHTML = generateMyStoryHTML(myStories[i]);
      for (let j = 0; j < myFavoritedStories.length; j++) {
        if (myFavoritedStories[j].storyId === myStories[i].storyId) {
          ownStoryHTML = generateStoryHTMLFavorites(myStories[i], true);
        }
      }
      ownStoryHTML.on("click", ".fas", function () {
        refreshStars(this.dataset.link);
      });
      $myArticles.append(ownStoryHTML);
    }
  }

  /**
   * Event handler for Navigation to Homepage
   */

  async function deleteFavorites(response, starStoryId) {
    // console.log(response);
    const theUlchildren = Array.from(
      document.getElementById("favorited-articles").children
    );

    const allArticles = Array.from(
      document.getElementById("all-articles-list").children
    );
    for (let i = 0; i < theUlchildren.length; i++) {
      for (let j = 0; j < allArticles.length; j++) {
        if (theUlchildren[i].getAttribute("id") === starStoryId)
          theUlchildren[i].remove();
      }
    }

    return response;
  }

  async function addFavorites(response, starStoryId) {
    // console.log(response);
    let favorites = [];
    for (let i = 0; i < response.data.user.favorites.length; i++) {
      favorites[i] = response.data.user.favorites[i];
    }

    for (let i = 0; i < favorites.length; i++) {
      if (favorites[i].storyId === starStoryId) {
        const aFavoriteHTML = generateStoryHTMLFavorites(
          response.data.user.favorites[i]
        );
        aFavoriteHTML.on("click", ".fas", function () {
          refreshStars(starStoryId);
        });
        $favoritedArticles.append(aFavoriteHTML);
      }
    }
  }

  async function loadFavoritedStars() {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    let user = await User.getLoggedInUser(token, username);
    if (user === null) return;
    const response = user.favorites;
    Object.values(response).forEach((value) => {
      const starredItem = document.querySelector(
        `[data-link="${value.storyId}"]`
      );
      // console.log(starredItem);
      starredItem.classList.remove("far");
      starredItem.classList.add("fas");
    });
  }

  async function loadFavoritedList() {
    $favoritedArticles.empty();
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    if (currentUser === null) return;
    currentUser = await User.getLoggedInUser(token, username);
    const response = currentUser.favorites;
    // console.log(response);
    for (let i = 0; i < response.length; i++) {
      const test = generateStoryHTMLFavorites(response[i]);
      test.on("click", ".fa-star", async function () {
        const response = currentUser.favorites;
        for (let j = 0; j < response.length; j++) {
          refreshStars(response[j].storyId);
          console.log(response);
        }
      });
      $favoritedArticles.append(test);
    }
  }

  function refreshStars(unfavoritedID) {
    const allStars = Array.from(
      document.getElementById("all-articles-list").children
    );
    for (let star of allStars) {
      const starStoryId = star.getAttribute("id");
      if (starStoryId === unfavoritedID) {
        const unfavoritedStar = $(`#${starStoryId}`);
        const changeUnfavoritedStar = $(unfavoritedStar.find("i"));
        changeUnfavoritedStar.toggleClass("fas");
        changeUnfavoritedStar.toggleClass("far");
      }
    }
  }

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    // if (username === null) return;
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories(onSubmit) {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
    loadFavoritedList();
    loadFavoritedStars();
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
       <span class="star">
          <i class ="far fa-star" data-link ="${story.storyId}">
          </i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  function generateStoryHTMLFavorites(story, myStoryFavorited) {
    let hostName = getHostName(story.url);
    let storyMarkup;
    if (myStoryFavorited === true) {
      storyMarkup = $(`
      <li id="${story.storyId}">
       <span class="star">
          <i class ="fas fa-star" data-link ="${story.storyId}">
          </i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
          <span class="trash-can">
          <i class ="fas fa-trash" data-link ="${story.storyId}">
          </i>
        </span>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);
    }
    // render story markup
    else {
      storyMarkup = $(`
      <li id="${story.storyId}">
       <span class="star">
          <i class ="fas fa-star" data-link ="${story.storyId}">
          </i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);
    }

    return storyMarkup;
  }

  function generateMyStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
       <span class="star">
          <i class ="far fa-star" data-link ="${story.storyId}">
          </i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <span class="trash-can">
          <i class ="fas fa-trash" data-link ="${story.storyId}">
          </i>
        </span>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
    ];
    elementsArr.forEach(($elem) => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navContent.show();
    $navLogOut.show();
    const pinNameToLogout = $("a > small");
    pinNameToLogout.text(`${currentUser.name}(logout)`);
    const pinNameToUserInfo = $("#profile-name");
    pinNameToUserInfo.text(`Name: ${currentUser.name}`);
    const pinUsernameToUserInfo = $("#profile-username");
    pinUsernameToUserInfo.text(`Username: ${currentUser.username}`);
    const pinAccountCreationToUserInfo = $("#profile-account-date");
    pinAccountCreationToUserInfo.text(
      `Account Created: ${currentUser.createdAt.slice(0, 10)}`
    );
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
