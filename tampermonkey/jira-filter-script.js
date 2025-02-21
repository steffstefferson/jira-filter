// ==UserScript==
// @name         Jira Filter By Team Member
// @namespace    http://tampermonkey.net/
// @version      1.9.4.2
// @description  filtering issues by team member in active sprint and backlog
// @author       Stef Käser
// @match        https://jira.post.ch/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    listenForUrlParamsChange();

    function listenForUrlParamsChange() {
        InitJiraFilters();
        window.setTimeout(listenForUrlParamsChange, 1000);
    }

    function InitJiraFilters() {
        let alreadyAdded = document.querySelector('#custom_jira_filters');
        if(alreadyAdded){
            return;
        }

        let notReady = !document.querySelector('.subnav-container') || document.querySelectorAll('.ghx-avatar-img').length === 0;
        if(notReady){
            window.setTimeout(InitJiraFilters, 500);
            return;
        }

        let isBacklog = (new URL(location.href).searchParams.get("view") || '').toLowerCase().indexOf('planning') >= 0;
        console.log('InitJiraFilters isBacklog: ',isBacklog);

        function filterIssues(name) {
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
            document.querySelectorAll(selector).forEach(element => checkIssue(element,name,elementToHideFn));
        }

        function checkIssue(element,name, elementToHideFn){
            let assigneeNameOfElement;
            // no avator image = unassigned
            if(element.querySelector('img') == null){
                assigneeNameOfElement = "Unassigned";
            }else{
                assigneeNameOfElement = getAssigneName(element.childNodes[0]);
            }
            let elementToHide = elementToHideFn(element);
            elementToHide.style.display = (name === '' || name === assigneeNameOfElement) ? '' : 'none';
            //debug: elementToHide.style.border = (name == '' || name == assigne) ? 'solid 1px green' : 'solid 1px red';
        }

        function getAssigneName(el){
            let assignee = '';
            if(isBacklog){
                // do not take (duplicated) icons from work summary
                if(el.parentElement.parentElement.classList.contains('ghx-assigned-work-stats')){
                    return null;
                }
                // expected alt text is: "John Doe, IT1.22's avatar"
                assignee = (el.alt || '').replace("'s avatar","");
            }else{
                // expected title text is: "Assignee: John Doe, IT1.22"
                assignee = (el.title || el.alt).split(": ").length && (el.title || el.alt).split(": ")[1]
            }
            return assignee.replace("Assignee: ","");
        }

        let avatars = new Map();

        document.querySelectorAll('.ghx-avatar-img').forEach(x => {
            let assigne = getAssigneName(x);
            if (assigne && assigne.length < 80) {
                avatars.set(assigne, x);
            }
        });

        const [avatar] = avatars;
        let img = avatar[1].cloneNode();
        img.src = unassignedImageBase64;
        img.alt = "Unassigned";
        img.title = "Unassigned";
        avatars.set('Unassigned', img);

        console.log("avatars: ", avatars);
        let lastFilter = null;

        function markFilteredAvatar(el) {
            if (lastFilter) {
                lastFilter.style.border = "solid 3px white";
            }
            lastFilter = el;
            if (el) {
                el.style.border = "solid 3px lightgreen";
            }
        }



        let container = document.createElement('span');
        container.id = "custom_jira_filters";
        container.style = "padding-left:15px;";

        avatars.forEach (function(element,name) {
            let el = element.cloneNode();
            el.classList.add('mp_m_blurb_vertical_wobble');
            el.style.border = "solid 3px white";
            if (el.tagName.toLowerCase() === "span") {
                el.innerText = element.innerText;
            }
            el.addEventListener('click', function (e) {
                markFilteredAvatar(e.currentTarget);
                filterIssues(name)
            });

            container.appendChild(el);
        });

        let clear = document.createElement('span');
        clear.classList.add('aui-button');
        clear.style["vertical-align"] = 'middle';
        clear.style["margin-left"] = '3px';

        clear.innerText = 'Clear Filter';
        clear.addEventListener('click', function() {
            markFilteredAvatar(null);
            filterIssues('')
        });
        container.appendChild(clear);

        let t = document.querySelector('.subnav-container');
        t.appendChild(container);
    }

    // some css hover effect when hover over the avatars
    let style = document.createElement('style');

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

    let unassignedImageBase64 = "data:image/png;charset=utf-8;base64,iVBORw0KGgoAAAANSUhEUgAAAIUAAACOCAYAAAAfHcv/AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAB6bSURBVHhe7V0JeFXVtV6ZB5KQQBjDFAiDzLMVEQKCVsUCDrVfURS/PgtisX2f73Xw2fb1+VqrrVZpS0v1+7SPghQHZtEACQoCghKZR8s8yZR5Dm/965x9c3Jy7gC559xzE/6bk7P3vufee9ba/1577X32EHGVQWEM3H5ERIQeq4Mx3ds1gSKQz1td09jfDRUi9XPYwpjxCubMQNj4fqBQnwnk81aZb5UWDgh7UgBWJDBDpV0LObx9p/E7rL7vWn7DjWgSpAg0w/F+PcLw5X4z0OIab2QBjL/h97tdiiZBCqBBhlugQQbyy+oz9TKT3/Z7DUPFjYTwdz9uRZNzNAOJA9XV1VRbWysHUFNTI2nR0dFyID0yMpKioqLkQFh9l3wHzvyKBGt0mH8rXBH2pPAFiIbMLSoqoksXLtK5c2fpwoULdObMGTp58hSnFzIZQIqrVFlZRRXl5RQbF0txcfHyeZAhPj6e2rVrRx07dqTU1FRKTUul1unp1KZNG0pOTvZKgnAmSJMkBUo9Mn/Hjh2U/8UO2rt3L504dkzIUFFRwRahhqoqK6m6pprLuVbikYGaFUCG1moZCs3wKTY2lmJiYsSCxMbEUlsmSVavLLr55ptpTHY2ZWVliSUxkyBcidEkSAERysrKqLi4mKj2Kn344Ye0avkK2rlrFxUUFDAJqiTTkKmqSkBYEcErWDO1TBCQDBZFq24QrpFwYmIi9el7E02ZMpUmT55M7Tt20D/oG24nS1iRwpsyUfqPHz9On2/bTh988AFt3LiRyktLPSU7MkorxXLAMvD34BUoPJ8zfAYkqWEfpLyinBISEmj0mDH0xBNP0DdG3SLEs4LbyaAQNqTwplBkfn7+l7RmzRrKXb+e/vXVV2LuYQ3U9XJmKa+FCApmMgAqDedavi9YooqKSsro3IlmPD6DHvrOdygtLU2/2vre3UyQsKs+jMosKS6hvNxcevnll2nfnj3iFMbGxvE13HKI4NaCnnEqU60y+Fpg/rzElfr4nuCoRsVE04SJE+nRRx+loUOHUlyC5rQaoWQwyuImhKVPUVVVRUcOH6F3lyyhd995V1oVSUlJbLajhBDILo+zKDFTZqqM4KRASGJFJpVmfA/hKrYaZWXllJGRQeNuH0/ZY8dS3379pPUSwy0bBbcSAnA9KYzKg3N37tw5WrP6A1qwYAHt2b2bYthvSE5Kluu8ZbA547xdZwXz9ca4SjVmLSxUDTujcHzLyyuoRXISdc/MpGHDh9Mdd95Bt4waRS1atJBr3UqMsLAUV5kMF7mJuXLlKlqxglsV+flUWFhEKSnJ0lQEWerAmeat+kAGcNATN7znD/6uNb6vdXTBGa0WJ7iCyYH3OrD1mDp1Kn1/1kzp+3CrpXB9NzdK3McbPqY5c56mXzz3c9q8aZN4/mlpqRQdpfU8AsgOLUu00odMqEcIhE3WxBj2C84/fC9eCiqsfkfFa/iealB9MTnQbE1lpxPVWyX7HCCxshRuRegtBX7dVGBwS8iASxcv0ntL3qE3Xn+Djp84Lk0/NDMBlRHhANwrWilR3DTO5Kpkyv330b3f+ha1b9++gfhK9lDCNdWHUgbOOE6eOEF/m/83WrxokZhgtCxUlQA1GquIcADuFVatvLJC5Bw7LptmP/UUjRgxQr+ivg5CSQzX+RToEDp44CC9+uqrtHzZMornJmY8N+vq/AaNEBEghKGF4VaIRQPR+aU6taqrqqm4pJj6DxxAP332WRo/frykA6EmBOAKn0LxEk8p9+zeQ88//z+09L33KC421kQIAErTCIHS53aIJeM8VhYAB6pA+Bp7du2mV195hR3nL/WrtetCDVdoFYqo5Crisy1b6efPPUfrctaK0uLjNEIoB64OXOrCpOqAbHLoMkim8x96XRMTEuWB3d///pb4TwqqkIQKIScFFFBZWUmfb/+cXnjhBdq6ZQt76sny+Noq0xsSxN1Q1gEvzcJpcSA6JpqiIqNoQ24e5eTkeCwiiKOuCQVCTgo8cdy1cxf97qWXaAcTA2MUoqOjoE39ijqAEFZEcTsUkcUH8oQ1OWLYYly6fJmW/POftH/vPkkDQkmMkJICJeOrI0foj3Pn0rZt2yghMUGcMXPmq7AqZeFGDtyrhwym+46MjBBrAf/irbfeosLCQkkXOVHVhACOk8LI/rNnztAb819nHyJHnEorQtQD60hKkLf3XQxv9wx9RLJMeJ6zbu1aWvb+UlxcjxBGnTkBR0mh2I/zlStXaOXKlfT+++/Je+idBJTyVMlq6hA5+Q8F4vKlS7R48WL2r7br72pw2mI4RgpFCAB+BJ5yolQUFhRKTyXIYCRCOFqD64HIzXrRnpdcpQP79tHCRQvp66+/1q9wHo6RQhECgmMg7dYtm2n37t3SD4E61VhtNBcrAYjcrBMgJiaWqqqraeMnG2kTH76gPmMHQuJoXmFvO39HvvRNxMVhUAzoUEeI5mIlAKOsKDhRbDEunD9P69avE2thzHzRkx63s0pxtPoA0MX79fmvZUwlKIBhc0bFGMnRHFBfTq23E9ZiN7dGDuzfL5mvyICwnWRQcLz6QEcVHnZd4FIQGxvDwkpyfeVwGkZRNwdioBBIZuuyooMLxMAUBUxNQNe/U2RQcLz6qKisoFOnTtFlrkJgJTysMILlD6cnoI0ByKCsKIC8RxVSVlJCx44dk/EkCsbrAHM8WHCcFDXVNVRWXi4DZTAIRWW8mQDNgRCAWX5jRhdcukxFhYWeNLO1sMt6OE4KVAtgP7p8o8LgKaeTMFYhIMLZs2fp4oWLXjO/yViKqsoqKikutk2gcIVUI7q1gN1AX04pF56ycq36MOsL8SZhKSAIZlRdunRJHCjM3LoBDSCEshRCEc5wxNSYEaeqDsCxXAEh8ACshB2oi0yKq7V1I5GaM7TMN2W4579GDqfhSK4oUwdS4MEPmqVat65+QTMGdKNVGxjcqw0vREzSOY45JOo6I8zxYMIRUii2gxRlpaVUWlxCUfqo7BsQe8D/9dFkemZDZWiyS+cep5kthp0WxNHqA84Tum7hU2D+Ayfq7zZvKAdTnRHC8yBMGGrdurWtBLCCY6SAYKg6sKJMYWEBk8J9lgKlEmMn4xMS9BT7YfQnoCMc8LdwTk5JoYTERFurCis4aimqmRQFhYWa8PyqKxnOAyVwxuOP0yuvvUprcj6idXl5tOfAftq5dw/l79pJeRs/ob/Mn09T7rtP/4Q9UDqAThCEnvCCz4WhiRhWIO85CEctBabTlXPbG74FBDeWEqeQ2T2T5s3/K23auoV+/LOf0l13303dMjMpo1OGfoUGzN7KHj+OXnjxt/TO++/R/Q8+oL9jD8zWICIyglLYUsByOQ3HSAHgCSnGUig4bSme++UvaPmqVTTOMPkmEPQfMID+9ze/oZ88+zM9xQlEyIMxeT7kMBwlhZqiD4GdthJz//Qnmvbww5qDe514bMYM+s+f/FiPBQ9KF55CwifUGLX62lpOw1FSQHSt7oTUdcqwG/ANJt55hx5rHB7/3vfoG7fcoseCD9GPqAi9vxXSYnMajpLCA+GCM47mnB/+UHyDYOKpOXP0UOOBgtFQD1pHHwhh1fKwSgsmHCOFEsRJT7pjRgbNfHKWHgseho8YTg9Pn67HgoOGVpNTvOjKbh06RgoIAlpcdY4T9O2Hvn1Nz1dQMtGXEgiGDB2ih4ILKTx6AbLXHniH7aQwmzotzswwpduBBx96SA95x6mTp+iv8+bRY49Mp369+9CAm/rS7JmzaP++/foV1kBTFmtmNBaq6nC6JeYLtpNCmbp65ECYk+10NOEMooPKF3I++ohuz86mV37/Mm3ZvFlPJZmpNf8vf9Fj1oAFGn/77Xrs+gH9KD14zkizTzV+4Uj1AUJI9cFnjzfNvLCzdPhzLk+fOkU/eHK2HmuI1atWyep7vjB8ZN0qNNcLsyUFkGKR7BgcIYWyFuiIgcnFI2K70apVKz1kjZ07d+oh78Boal/o27evHmocUDhgJTyFRAoR6y2yzlxYkccuOEIKBawK16tXL20CkFKATRg8xLcjaKwuvAFrZvhC+w6BLdDuC6rKMELIwKyoran1kEEVLCPsIopjpIAAsBJdu3aTuh6Lm1kpJFjw5wRiGSV/yN+xQw9ZIzGIT1PFWnDGq2oWvZmlZaUybNEbrIgSDDhGCggA5ywpqQWlJKdowtokFBDP1sgXCq5c0UPegQVdfQGPtRuLehaTg1rp14hRWVHZ9Hs0McklIT6BYuPjZP4HFuywC/7GRGApBH/Awztf/RZ4joInmY2Fx2LyCWTACoEdOnakbG4ZGXcDcAqOkiKSHc1W6a25CukqVsPOUoA1vL0B8ynUijH+gAzyhWvpHLMEGwY1RVIIgUlSbEGzevSgoUOHNP77rwO2/6JmDjVA2LTUVBrCTqAsS1wZWO/h9cCXI4nF1gJFrJ9qyDgU4HoAneBQLRBWmCyQBie2RXKyfpWmR6Mu7YTtpBCBdYGwnRPWpDh8+LDtg0dWLFtOJ0+e1GN1OHP6NK1euUqP+QZaS75KKkalN9baGX0KhLWXVv2ZdQRdAnaTwxHbhCd+R48epRd+/Wt6cuYsenvRIqqsqpSmqV34bOtWmpA9jtbm5EhXNo689bk0bsxY2pCXp1/lG0/N+YEesgZIEQwoawEgwzFoFwNsVJqCKlyqoNkFR5Zhxi5/f3xtLr3x+uuQTKqOmOgYvUy4D23atqEXXnyRbh09Wk+xxu5du+iBqY0bwym+hK4JHDVV2t6okybfS3Oeflr8LwVFCLthu6WA937kyBHatGkjM5Bkb0/Zo0N3rtwGjM5aumKFX0IAZ06f0UPXD9BBWQocsoYop63PWSvd8Iv+sdDTAnKCEIDtpCgvL5dVa9AERHUBYnhMoJQN9+CJmd+XcZz+HqQpvLNkiR66foilgLGGTviAD4PZ+EWFRfTF55/TggX/R4cOHtSucQi2kwL17vkzZ6mYhUSTFOMplIVwk6X4/R9eoX9/5hk95h95uXkB+ya+YC4YyHyMdUcLJD4+gc6yNdrK/pFTVgKwnRToroW1QD++GW6xFBhFdc+kSXrMP9CqmT1zph6zD1h0FbrD2lcVZeV6qv2wnRSY61HB1kKbPKulKTK4xVLMmv2kHvIPDL6ZPu1hR7qfYR3wO2dPn6WvL9RfV9PO6sR2UtTPeMTq4m6wFBh3EagP8dGaD2nKvffKWAwnAFKgOX/u/DlZURBQZLCzOrGdFOBAfRqwQ2VICTWmP/qYHvIOOMm/fv55mvPUU3qKg2AOYLplSWmJRMVBt9npdMBS8KH3CjrpLAWKnj176iFrbP70U7pv8hT6+5tv6SmhgVF3duvRdlKgiYXH2LAOMIVuI0ZycpIessbz//0rx6oLM8QesLriEhJkuIGCshR2WQzbSREdHUMtU1vKGtwClsMtVUhWVpbPR+wXL16UjrdQAZkeFRUtk5/bd+xQz59A2K4CZjsp4uLjqEvnLpSeni5jKBQh3OBkVvtpQTg9uVcVFM+ZT9jLtF3bdtIT7FQVYjspYmNiqV379pSWmiaZAIa7xVLAgfMF9BPYDWSuOhREPxyHrrDBXlbPrEZNjL5W2E6KqOgoSm+TTt26Z8qDHjF7/HIDMfz2NThACqkS8GcqLBLndIypyOqRJWlOwXZSAKi3u3TtSjGxMZIRnpFG0EYIUV1j86iqAOEhA6tD6+TTiIFThw4dGiyoYjcckTqpRRL16dNH5mKA/WIalSJCCPg4vuCkTyH6iNQGNwMoPLAWXbt1pTTTHBaxLjbCEVJgF8HefXrL2IBafV1IN8DX8HnAWM/biXpVRq22CG0tn7E/KyYcYQSYkQh235cz9pGR0rIlDRo82FMSnFK4L/ibYe5M9aEvqqqsJp8QRuGBL9a9Rw+5Dyf15RgpWjIphg0bJlUISqjdJjAQ+LsHZ0ihL6rKL0AIwSTBb2M2Xffu3SUdMN+vXTp0jBQYYJOZ2Y2PTCGFbF+gKwKqgIBmH8McDzbcYSlAizpCQA/QD3ox+/brJ/073qyEXdbDMVJAgFYsIOZ4CsPrsbz+4u241glzibrbTQA5oBvM/Wjbtg0NGDjA0f4JBcdIAWCx0KFDhwr7scWDkQhQBl6qtKi4ncBvHDt6VI81xPFjx/SQvTBaRK3qiKBu3TKpO1tVI5woKICjpEAV0r1nFvXr358qyiskU8QqGJSi4C092Ph006d6qCE2bdqkh+wDZNTIrxUGtDow3wNN0ZZpaZ4C4iQcIwUEg2WAozlw4ECKiY/T6nTUJPxSJLDbOpixaOFC2run4Qx0LFjy9sJFeswJaHLX1FRTSmoq9evbT6ZCiF4cshAKjpFCCYYJuYOHDaVOGRlUhnGHerqUCF0xQg5D3E4cPHBAxktgZPaX+flyIHz/lKkyitpu1MmoDS3A4GYsAY3HAk6TQcGRyUAK+CkIin1JX/rti7T47cUyngGP17HhiRmhsBxOwyhjtT4T/6577qGf/dezsrWDNyhd2gHbLYWRcxAC8fT0NnTXXXdRp04ZVFiICbqag2lGUyeEgMUW2UXUq1xI2JIOHiSE8CW9nVbEdlKYbx5xDLgZfvNI+u4jj1BSixbaRnNcl6ITx0MO1ggmDjUVWJEeQCER8svbEdS1axcaMWKkvGdftvuGo60PBc1apNO0h6fR92fPotYcxo7GGCCLMQ5CDliVUGnFDrAsZmJARpGTOVFaWipVx21jx1B/bp0ZLazTcNSnAPBzRuuB3Qe3bdtGK5Yuo00bN9EVJgdKjrHrtylBZGexIBvCWPurhAnRklsckybdQ8888x/UUX9UbtaVU3CcFIBZWMSx5QPWrVi2dCk7oG9TSVExxcfFhz0xYB2EAKYzZEaTvE27tuxf3U1jxoyhgexLwIICZh05CUdI4U1AczqmyH388cf0y+d+TsePHZdF05oSRFbWNpqeIERbJsQPnn6apk37LlfkWk0eSjIoONL68CYk0sFIxUt0bsXHxsmwPXT3hreNqA+xECwnDmyGg97d0bfdpu1DYiKE0keo4EjrQwlpJSzookiDgbLx8XGeHfZCW16CA5DBCFk4ldWAaQ8jho+gtm3bevSi9KDOoYIjrQ9FDEthDUSJYAuRmpYmbfToyCi6ajFTPezAIis/ApDZ95yW2jJVqg/AqBerguM0HCEF4JX9ejqUEcVhDEHLyOgoKqz2M3TPXApdCRZEOZgCPqFllZqWSult2mhpBoTaSgCOkcIflDJi42KpNSsrOhZd36EvNY2FshAKkCkyKpISW7SgpJS6JRHdBNeQQhEAa2p37tyZWnE1IiO0wsEa+IC6fw859BPkxEa0boSrLAWIgbEEeILaOr21jC0wlzS78Md5f6aP1q+TY+6f/6SnNh7G+68jeIRMkgrFqKpA4BpSACAGFNWpUyfqntldun3tHjI3avSttDYvlyZMnEhdunSRY+Iddwg5grHVJGQyWwvMD8WDLwxmdiNcQQqj7wAloknatVs3acv7IkUwrMikSfcKCc0AOe65N/B1sLwBoskQfp0cuGOZMcffj/4YN8IVpFBVhwJGHA0aNJBSW7Wy3VLcMsq7Nbhl1Cg91Bjoz3FYPrxYVBmrimUQ3ApX+RQAlIeZ1r1795HpAHaTwhfqfIDrh2YdtCYpZn9Bzs5smXr37q1f4T64yqcAIRQ5UlJb0sBBg6Tr22hFFIKRYcCWzd5X9N+82fug3kDhIYT+giPd+6abZBESt8JVPoUiBICxnMOHD5enhlZLBkDBwcCqlSstly/CWpkrl6/QY42DuleImczOJXZAdmvLA3CNT2GGmlGGSckYu4hrlHUIlpUANn7yCY0fm02569cLEXBg5X/sABDI5nM+wSQQ66ffL8KYBtivb19L6+cWhGQ8RaDAdgyv/eEPtHjR29LRo0qcMsfq7GYowldXVVNMXCx974l/oydnz/a78V0o4arqQ0HF0eWNtZ7gbBothduJYIZaXqBtmzY0cMBAVxMCcGX1oeJoysExAwVAFGUdgHCwEgK+RblPvm1sv5nZQ5tF7mID7Z7Wh5WSMBdEliAy3KUiQlgQgoH7lM3i+JWRkSFPRnHnIL5bieEaUpitBVDLSqviutgMZS3CBSB3HFs8jJ8w7pdqJbMb4BpSWKGivJzOnz1LUYbbDJtqQ4eyCPGJCUyKdlIdggo3qo8AYFYSHLNLly7LirdY2xvKNRIiXKwF5MIdR0RFyeqAiiS+rITSRaiIE3pSsNxGJYkS+cB8iGPHjtLpU6cpmhWKwa5QryKDMexmSMbyH8aGlJaUelpSRpgzPxDi2InQk4LlNhJChbG/xYbcPCooLJSxB2iJQLn1nzjWV6YbgW56HGVMCOycDLIDRiKYMz+UhABc0XmllIAzyIAJQTi+OvKVbCuN6gPOWigV1SiwhtGK6tylC02eMplGj76NunXrJn0wGHaoEGoyKIScFPhxqAHm9cC+fTT3tbn0werV0oxLTEiQ8YxGq6DC4WIp6oCtn6qpiuVMSk6SPovRt95K9z/4APUyPTE1FpJQkCT0pOCfr2STunXLVnrppZfoi+3bZTFR7OLrIQIUw0EjGcKFFGZCo5mNzfYqKitkAfv+A/rTrFlP0t333C37qisSwPdAtRMKhJwUmG2dm5tLv3vxRTq0/6CUIk/p0IkAGIkRLlB3CmnMZEaGYw5IYVGR7GE2bfrD9Ohjj8la3ArImrC3FGYh8MXeRMK1mGG+9N33aN68eXTixAlqmdLS4z80F1xlfZWXlbFljKQ77/qmbGV9U9++2nt8+KKEej/Y5AkaKdSNBXKDcB4PHzpM8+fPp5XLllNxSbEMUfN8ju/IWKqaMpTOsKkvqpNR7Gf86Ec/opHfuLmBHgPRLRDodd5gq6VoAP6lgiuXac2aD+nNN9+kL7/8kmKjsVNvvPY5nQxAcyCEEZC/qrKKKqsqqWfvXjRz5ixpqcDPALzp9lrTA0HQLYVVmP8xGQpo27bPaOHCRbTpk0+4vV4pzwPQugAFUGWYFyppbsSAqNjct4qtRkrLFLrvgQfokUenU48ePTw6NZ/lY4ZwMBB0SwF4bpDjRQWF9OnmT+ld9h02bNhAxYWFMjBXOnXqkUAjhvpssyMEo05mthpVVdK3MXDQQJoxYwZNmDCRkpkovogQLHIEhRTGm1FfJ5bhs620fPlyWpuzli5euChNzQSuKnCNynBj5huVYmU5mgOUDlBosEkNlj7CspLjx99OD3z7QRo2fBglp9SRAzDqPxgIavWBtvX5c+dk3OOqVatljOPFCxdkKB0IoV2Hoy7DRRikIewhRfOEkt9zZt1g6iSeFmMtc4zFGJudTVOnTqURN4+sN8NMEcNIEGP4WhAUUmC0NQa8rl69mtZ9lEO7du2SaiM6RnMiZfFUJowxw1XIfMvNkRhWMhvTsA0GekOx/BNaKBjhPnTYUBo3fjxljxsng5uNuF4yKPglBd60+npYheKiItq/bz+3JtbQ+vXr6ei//iXNTUyHw9aTMIHNLYODjXrk4BeeFuOhGgoiRrx37tRZZrmNnzCBBg8ZLMtP+usJNZPGHPdPCsMHcCOlRcXS0fT5F19QXl4ubd++XcY9oPMFrQl1rZz5m2+QIkjQdWnUKwYEowmL50aYatmrTx+ZK4Mpl5ncYsHSSXjoZjVQWOWr8Qwg3IAU6iJYgsKCAjp86BDt2bOHiouLpUv64MFDlJ+/g86ePsvX1Ii/gF355GYZitlGht/A9cNKjw3SOIimLJ4h4ZkKphJgiShYEWw51bNXT+revYc8mW3VupU4qsgzIyFU/gGWpCgrLRMn8R8LFtBnW7fKnt9oIuFm8IchZXAco6O0VeysBo5InL/5BjGCAyt9mgsgrsGBOSZl5WXSF8S5I9U5nNLWrdPF/8Da3/369eejL2V07iz5aYSQAkTAl6Gr9QD7CEuWLKEVK1bQ8aNHpd6CNQAB8MOor2T/LyaDFYw334DRN3Bd8KVHq/ckD/QzHrrBD4GTWllZJQ5/RFSkrPCbyZZjxMiR3KIZS0P0HZvkc1zKr6Jq2JmfTzk5OZSXm0eHuIrA8oWJLRJ1a8A/ayCB+lEF2BpPMxPX8qs59jHYBXPGq7g3sjS4nvNLFVZYdvggGCVfxf4Irm6V3pqGMSnu/OY3ady4bIp4+x8Lr76/dCnt3b1bOpzwITgmMWhG4lvkT7MknrD+o/XSDGH8EEgiaTdgG+rr3IIM9eJanphbJpinixoCTd7EhERt85luGZ2vVlVXyTrYGCCLH7pqyEt/PwxYpd2AfWiQJ6Y4YMwThFUvEbIWtQAixvdh4cVZZYJE9O6RVfdNN9BsYSRRaMZ73YBrADIAIAQsDl43SNHMIWRQxECLgRFyUqgbsoKv99wCKV16CQsm7PhOb1DVBoDwDUvRSEgTXG+GBwviODoEI/FUOOSkMCrTXDqCqWi3wsoi2EE0b8BvqN+XcEQE/T94u21rJ734wAAAAABJRU5ErkJggg==";

})();