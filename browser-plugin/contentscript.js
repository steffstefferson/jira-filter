
//register url change events
listenForUrlParamsChange();

function listenForUrlParamsChange() {
    InitJiraFilters();
    window.setTimeout(listenForUrlParamsChange, 1000);
}

function InitJiraFilters() {
	var alreadyAdded = document.querySelector('#custom_jira_filters');
	if(alreadyAdded){
		return;
	}

	var notReady = !document.querySelector('.subnav-container') || document.querySelectorAll('.ghx-avatar-img').length == 0;
	if(notReady){
		window.setTimeout(InitJiraFilters, 500);
		return;
	}

    var isBacklog = (new URL(location.href).searchParams.get("view") || '').toLowerCase().indexOf('planning') >= 0;
    console.log('InitJiraFilters isBacklog'+isBacklog);

    function filterNow(name) {
        console.log('filtering now ' + name + ' in backlog: ' + isBacklog);

        if (isBacklog) {
            filter(name, '.ghx-issue-compact div *.ghx-estimate', function(el) {
                return el.parentElement.parentElement.parentElement
            });
        } else {
            filter(name, 'div[data-issue-key] .ghx-avatar', function(el) {
                return el.parentElement.parentElement;
            });
        }
    }
    
    function filter(name, selector, elementToHideFn) {
        document.querySelectorAll(selector).forEach(x=>{
            //handle unassigned issues
            var assigneNameOfElement = x.childNodes.length > 0 && getAssigneName(x.childNodes[0]);
            var elementToHide = elementToHideFn(x);
            elementToHide.style.display = (name == '' || name == assigneNameOfElement) ? '' : 'none';
            //debug: elementToHide.style.border = (name == '' || name == assigne) ? 'solid 1px green' : 'solid 1px red';
        }
        );
    }

    function getAssigneName(el){
        var assigne = '';
        if(isBacklog){
            // expected alt text is: "John Doe, IT1.22's avatar"
            assigne = (el.alt || '').replace("'s avatar","");
        }else{
            // expected title text is: "Assignee: John Doe, IT1.22"
            assigne = (el.title || el.alt).split(": ").length && (el.title || el.alt).split(": ")[1]
        }
        return assigne.replace("Assignee: ","");
    }

    var avatars = new Map();

    document.querySelectorAll('.ghx-avatar-img').forEach(x => {
            var assigne = getAssigneName(x);
            if (assigne.length < 80) {
                avatars.set(assigne, x);
            }
        }
    );

    console.log(avatars, avatars);
    var lastFilter = null;

    function markFilteredAvatar(el) {
        if (lastFilter) {
            lastFilter.style.border = "solid 3px white";
        }
        lastFilter = el;
        if (el) {
            el.style.border = "solid 3px lightgreen";
        }
    }

    var container = document.createElement('span');
    container.id = "custom_jira_filters";
    container.style = "padding-left:15px;";

    for (var element of avatars.values()) {
        var el = element.cloneNode();
        el.classList.add('mp_m_blurb_vertical_wobble');
        el.style.border = "solid 3px white";
        if (el.tagName.toLowerCase() == 'span') {
            el.innerText = element.innerText;
        }
        el.addEventListener('click', function (e) {
            markFilteredAvatar(e.currentTarget);
            filterNow(getAssigneName(e.currentTarget))
        });

        container.appendChild(el);
    }

    var clear = document.createElement('span');
    clear.classList.add('aui-button');
    clear.style["vertical-align"] = 'middle';
    clear.style["margin-left"] = '3px';

    clear.innerText = 'Clear Filter';
    clear.addEventListener('click', function(e) {
        markFilteredAvatar(null);
        filterNow('')
    });
    container.appendChild(clear);

    var t = document.querySelector('.subnav-container');
    t.appendChild(container);
}

// some css hover effect when hover over the avatars
var style = document.createElement('style');
style.type = 'text/css';

style.innerHTML = `
    .mp_m_blurb_vertical_wobble:hover {
            -webkit-animation-name: hvr-wobble-vertical-sm;
            animation-name: hvr-wobble-vertical-sm;
            -webkit-animation-duration: 1.5s;
            animation-duration: 1.5s;
            -webkit-animation-timing-function: ease-in-out;
            animation-timing-function: ease-in-out;
            -webkit-animation-iteration-count: 1;
            animation-iteration-count: 1;}

    @keyframes hvr-wobble-vertical-sm {
        16.65% {
            -webkit-transform: translateY(4px);
            transform: translateY(4px);}
        33.3% {
            -webkit-transform: translateY(-3px);
            transform: translateY(-3px);}
        49.95% {
            -webkit-transform: translateY(2px);
            transform: translateY(2px);}
        66.6% {
            -webkit-transform: translateY(-1px);
            transform: translateY(-1px);}
        83.25% {
            -webkit-transform: translateY(1px);
            transform: translateY(1px);}
        100% {
            -webkit-transform: translateY(0);
            transform: translateY(0);}}`;
document.getElementsByTagName('head')[0].appendChild(style);
