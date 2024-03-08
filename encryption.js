//PLACEHOLDERS
function encrypt (data, private) {
    return btoa(data);
}

function decrypt (data, public) {
    return atob(data);
}

function sign (data, private) {
    return data;
}

function verify (data, public) {
    return true;
}