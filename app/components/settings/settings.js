'use strict';

angular.module('bars.settings', [

    ])

.config(['$stateProvider', function($stateProvider) {
    $stateProvider
        .state('bar.settings', {
            url: "/settings",
            views: {
                '@bar': {
                    templateUrl: "components/settings/layout.html",
                    controller: 'settings.ctrl.base'
                }
            }
        })
        // Settings password
        .state('bar.settings.credentials', {
            url: "/credentials",
            templateUrl: "components/settings/credentials.html",
            controller: 'settings.ctrl.credentials',
            resolve: {
                me: ['api.models.user', function(User) {
                    return User.me();
                }],
                user_list: ['api.models.user', function(User) {
                    return User.all();
                }],
                account_list: ['api.models.account', function(Account) {
                    return Account.all();
                }]
            }
        })
        // Menus
        .state('bar.settings.menus', {
            url: "/menus",
            templateUrl: "components/settings/menus.html",
            controller: 'settings.ctrl.menus'
        })
        ;
}])

.controller('settings.ctrl.base',
    ['$scope',
    function($scope) {
        $scope.bar.active = 'settings';
        $scope.settings = {
            active: ''
        };
    }
])
.controller('settings.ctrl.credentials',
    ['$scope', 'me', 'auth.service', 'api.models.user', 'user_list', 'account_list',
    function($scope, me, Auth, User, user_list, account_list) {
        $scope.settings.active = 'credentials';
        $scope.pwdSuccess = 0;
        $scope.usernameSuccess = 0;
        $scope.oldPwd = null;
        $scope.newPwd = null;
        $scope.newPwdBis = null;
        $scope.myUser = me;
        $scope.npseudo = '';
        $scope.nusername = '';
        $scope.alerts = [];
        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        }
        $scope.checkPseudo = function() {
            return _.filter(account_list, function(a) {
                return $scope.npseudo != '' && a.owner.pseudo == $scope.npseudo;
            }).length == 0;
        };
        $scope.changePseudo = function() {
            $scope.alerts = _.filter($scope.alerts, function(a) {
                return a.context != 'pseudo';
            });
            if ($scope.checkPseudo()) {
                var tempPseudo = $scope.npseudo;
                $scope.npseudo = '';
                $scope.myUser.pseudo = tempPseudo;
                $scope.myUser.$save().then(function(u) {
                    $scope.alerts.push({context: 'pseudo', type: 'success', msg: 'Ton pseudo a été changé avec succès.'});
                    $scope.myUser = u;
                }, function(errors) {
                    $scope.alerts.push({context: 'pseudo', type: 'danger', msg: 'Une erreur est survenue : ton pseudo n\'a pas été modifié...'});
                    User.me().then(function(u) {
                        $scope.myUser = u;
                    });
                    $scope.npseudo = '';
                    console.log("Changement de pseudo échoué.");
                });
            }
        };
        $scope.checkUsername = function() {
            return _.filter(user_list, function (u) {
                return u.username.toLocaleLowerCase() == $scope.nusername.toLocaleLowerCase();
            }).length == 0;
        };
        $scope.changeUsername = function() {
            $scope.alerts = _.filter($scope.alerts, function(a) {
                return a.context != 'username';
            });
            
            if ($scope.checkUsername($scope.nusername)) {
                var tempUsername = $scope.nusername;
                $scope.nusername = '';
                $scope.myUser.username = tempUsername;
                $scope.myUser.$save().then(function(u) {
                    $scope.alerts.push({context: 'username', type: 'success', msg: 'Ton login a été changé avec succès.'});
                    $scope.myUser = u;
                }, function(errors) {
                    $scope.alerts.push({context: 'username', type: 'danger', msg: 'Une erreur est survenue : ton login n\'a pas été modifié...'});
                    User.me().then(function(u) {
                        $scope.myUser = u;
                    });
                    $scope.nusername = '';
                    console.log("Changement de username échoué.");
                });
            }
        };
        $scope.changePwd = function() {
            $scope.alerts = _.filter($scope.alerts, function(a) {
                return a.context != 'pwd';
            });
            if ($scope.newPwd == $scope.newPwdBis) {
                console.log(me);
                User.changePwd($scope.oldPwd, $scope.newPwd).then(function() {
                    $scope.alerts.push({context: 'pwd', type: 'success', msg: 'Ton mot de passe a été changé avec succès.'});
                    $scope.newPwd = '';
                    $scope.newPwdBis = '';
                    $scope.oldPwd = '';
                }, function(errors) {
                    $scope.alerts.push({context: 'pwd', type: 'danger', msg: 'Une erreur est survenue : ton mot de passe n\'a pas été modifié...'});
                    $scope.oldPwd = '';
                });
            } else {
                $scope.alerts.push({context: 'pwd', type: 'warning', msg: 'Les mots de passe sont différents.'});
                console.log('Mots de passe différents.');
            }
        };
    }
])

.controller('settings.ctrl.menus',
    ['$scope', '$timeout', 'api.models.menu', 'auth.user', 'sellitem',
    function($scope, $timeout, Menu, AuthUser, sellitem_list) {
        $scope.settings.active = 'menus';
        $scope.menus = AuthUser.menus;

        $scope.selectMenu = function (menu) {
            $scope.selectedMenu.originalMenu = menu;
            $scope.selectedMenu.menu = _.clone(menu);
            $scope.selectedMenu.menu.items = _.clone(menu.items);
        };

        $scope.deleteItem = function(index) {
            $scope.selectedMenu.menu.items.splice(index, 1);
        };

        $scope.closeMenu = function() {
            $scope.selectedMenu = {menu: undefined, originalMenu: undefined};
        };
        $scope.closeMenu();

        $scope.saveMenu = function() {
            var originalMenu = $scope.selectedMenu.originalMenu;
            var menu = $scope.selectedMenu.menu;
            originalMenu.name = menu.name;
            originalMenu.items = _.clone(menu.items);
            originalMenu.$save().then(function (newMenu) {
                newMenu.updateRank();
                if (!menu.id) {
                    AuthUser.menus.push(newMenu);
                }
                $scope.closeMenu();
            });
        };

        $scope.sellitem_listf = function (t) {
            return _.filter(sellitem_list, function (o) {
                return o.filter(t) && _.find($scope.selectedMenu.menu.items, function (s) {
                    return s.sellitem.id == o.id;
                }) === undefined;
            });
        };

        $scope.addItem = function (item) {
            $scope.selectedMenu.menu.items.unshift({sellitem: item, qty: 1});
            $scope.selectedMenu.newItem = "";
        };

        $scope.createMenu = function() {
            var newMenu = Menu.create();
            newMenu.name = "";
            newMenu.items = [];
            $scope.selectMenu(newMenu);

            $timeout(function () {
                document.getElementById("name").focus();
            }, 300);
        };

        $scope.deleteMenu = function() {
            var id = $scope.selectedMenu.originalMenu.id;
            $scope.selectedMenu.originalMenu.$delete().then(function () {
                var key;
                _.forEach(AuthUser.menus, function (menu, k) {
                    if (menu.id == id) {
                        AuthUser.menus.splice(k, 1);
                    }
                });
                $scope.closeMenu();
            });
        };
    }
])
;
