
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
$userpassword = create_hash($data->userPw);
$useremail = mysql_real_escape_string($data->userEm);

//Note - These two lines assume that we are using root@localhost
//for our admin control, and the database is "covelogins". Change
//the database name depending on how it's set up.
$con = mysql_connect('localhost', 'root', '');
mysql_select_db('covelogins', $con);


$checklogin = mysql_query("SELECT * FROM users WHERE Username = '".$username."' AND Password = '".$userpassword."'");
if(mysql_num_rows($checklogin) == 1)
{
    $arr = array('msg' => "", 'error' => 'User already exists with the same email or account name.');
    $jsn = json_encode($arr);
    print_r($jsn);

}
else
{
    $registerquery = mysql_query("INSERT INTO users (Username, Password, EmailAddress) VALUES('".$username."', '".$userpassword."', '".$useremail."')");
    if($registerquery)
    {
        $arr = array('msg' => "User successfuly registered");
        $jsn = json_encode($arr);
        print_r($jsn);
    }
    else
    {
        $arr = array('msg' => '', 'error' => "Oops; something went wrong. Please go back and try again.");
        $jsn = json_encode($arr);
        print_r($jsn);
    }
}
?>