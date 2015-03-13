
<?php
include "hash.php";
?>

<?php
/**
 * Created by PhpStorm.
 * User: willi_000
 * Date: 3/8/2015
 * Time: 6:58 PM
 */

$data = json_decode(file_get_contents("php://input"));
$username = mysql_real_escape_string($data->userNm);
$userpassword = mysql_real_escape_string($data->userPw);

//Note - These two lines assume that we are using root@localhost
//for our admin control, and the database is "covelogins". Change
//the database name depending on how it's set up.
$con = mysql_connect('localhost', 'root', '');
mysql_select_db('cove', $con);

//$hash = mysql_query("SELECT Password FROM users WHERE Username = '".$username."'");
//$checkTrue = validate_password($userpassword, $hash);
$checklogin = mysql_query("SELECT * FROM users WHERE Username = '".$username."' AND Password = '".$userpassword."'");
if(mysql_num_rows($checklogin) == 1)
{
//if (checkTrue) {
    $row = mysql_fetch_array($checklogin);
    $email = $row['EmailAddress'];
    $userid = $row['UserID'];

/*    $arr = array('msg'=> 'Got in!', 'userIden' => $userid, 'userEm' => $email, 'error' => '');
    $jsn = json_encode($arr);
    print_r($jsn);*/
    $arr = array('msg' => "Logged In", 'userIden' => $userid, 'userEm' => $email, 'error' => '');
    $jsn = json_encode($arr);
    print_r($jsn);
}
else
{
    $arr = array('msg' => '', 'error' => 'Wrong account name or password');
    $jsn = json_encode($arr);
    print_r($jsn);
}
?>