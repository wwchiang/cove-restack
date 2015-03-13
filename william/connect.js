/**
 * Created by willi_000 on 2/26/2015.
 */

var myApp = angular.module('LoginApp', [])
    .run(function($rootScope) {
        $rootScope.userID = "default";
        $rootScope.userName = "";
        $rootScope.userPassword = "";
        $rootScope.userEmail = "";
    });

//Login Controller - Provides access for the user to make function
//calls and perform actions onto the page.
//Action 0 = login page
//Action 1 = register page
//Action 2 = Successfully Logged In, redirect to next page.
//Action 3 = Successfully Registered, redirect to login page.
myApp.controller('LoginController', ['$scope', '$http', '$rootScope', function($scope, $http, $rootScope) {
	
	console.log('Root -> '+$rootScope.userID);
	console.log('Root -> '+$rootScope.userEmail);
	
    $scope.errors = [];
    $scope.msgs = [];
    $scope.action = 0;


    $scope.setAction = function(param) {
        $scope.action = param;
        $scope.userName = "";
        $scope.userPassword = "";
        $scope.userEmail = "";
    }

    //Tries to login given the userName and userPassword field. If it's successful, it will
    //set action to 3, which is then redirect page to menu given the data.
    //If this is NOT successful, then action will stay at 0(login page), which means that an error
    //occured. In index, then we pull up the error code.
    $scope.login = function() {
        $scope.errors = [];
        $http.post('fetch.php', {'userNm': $scope.userName, 'userPw': $scope.userPassword})
            .success(function(data, status) {
				console.log("In");
				
				console.log(data);
				
                if(data.msg != '') {
					
					console.log("In");
                    $rootScope.userID = data.userIden;
                    $rootScope.userEmail = data.userEm;
					
					console.log('New ->' + $rootScope.userID);
					console.log('New ->' + $rootScope.userEmail);
					
                    $scope.action = 2 ;
                    $scope.msgs.push(data.msg);
					
                    console.log(data.msg)
                }
                else {
                    $scope.errors.push(data.error);
                    console.log(data.error);
                }
            }).error(function(data, status){
                $scope.errors.push(status);
            });
    }

    //Tries to register given username, pw, email. If successful, change action to 2, which means
    //successful registration, which will show a prompt, then refresh to login page.
    //Otherwise, this will be stuck at 1, which means an error occurred. Show errors in Index.
    $scope.register = function() {
        $scope.errors = [];
        $http.post('register.php', {'userNm': $scope.userName, 'userPw': $scope.userPassword,
        'userEm' : $scope.userEmail})
            .success(function(data, status) {
                if(data.msg != '') {
                    //if it's not '', then that means that we successfully inserted the user into
                    //the database
                    $scope.msgs.push(data.msg);
                    console.log(data.msg)
                    $scope.action = 3;
                }
                else {
                    //otherwise, user may already be registered
                    $scope.errors.push(data.error);
                }
            }).error(function(data, status) {
                $scope.errors.push(status);
            });
    }
}]);



