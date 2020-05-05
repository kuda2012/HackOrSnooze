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
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
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
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
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

  /**
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
    // $loginForm.slideToggle();
    if (currentUser) {
      $allStoriesList.show();
      $submitForm.slideToggle();
    }

    // $allStoriesList.toggle();
  });

  $navAll.on("click", function (evt) {
    evt.preventDefault();
    document.getElementById("favorited-articles").classList.add("hidden");
    counter = 0;
  });

  let counter = 0;
  $navFavorites.on("click", function () {
    document.getElementById("favorited-articles").classList.remove("hidden");
    if (counter % 2 === 0) {
      $allStoriesList.hide();
      counter++;
    } else {
      document.getElementById("favorited-articles").classList.add("hidden");
      $allStoriesList.show();
      counter--;
    }

    // console.log(getFavorites);
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
    const response = await storyList.addStory(currentUser, formValues);
    // console.log(response);
    generateStoryHTML(response.data.story);
    generateStories();
    $submitForm.slideToggle();
  });
  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  function activateStars() {
    const allStars = Array.from(document.getElementsByClassName("fa-star"));
    for (let star of allStars) {
      const tagStar = star.getAttribute("id");
      star.addEventListener("click", async function () {
        this.classList.toggle("far");
        this.classList.toggle("fas");
        if (this.classList.contains("far")) {
          storyList.deleteFavorite(currentUser, tagStar);
        } else {
          const response = await storyList.addFavorite(currentUser, tagStar);
          const $theUl = $("#favorited-articles");
          for (let i = 0; i < $theUl.length; i++) {
            const result = generateStoryHTML(
              response.data.user.favorites[i + $theUl.length - 1]
            );
            console.log(response.data.user.favorites);
            // console.log(result);
            $theUl.append(result);
          }
        }
      });
    }
  }

  // function createList(url) {
  //   const getUL = document.getElementById("favorited-articles");
  //   const createLi = document.createElement("li");
  //   createLi.innerText = url;
  //   getUL.append(createLi);
  //   console.log(getUL);
  // }

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

  async function generateStories() {
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
    activateStars();
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
          <i class ="fa-star far" id ="${story.storyId}">
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
